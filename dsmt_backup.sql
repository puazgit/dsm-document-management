--
-- PostgreSQL database dump
--

-- Dumped from database version 15.14
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: activity_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.activity_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'VIEW',
    'DOWNLOAD',
    'APPROVE',
    'REJECT',
    'PUBLISH',
    'COMMENT',
    'LOGIN',
    'LOGOUT'
);


--
-- Name: document_relation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_relation_type AS ENUM (
    'PARENT_CHILD',
    'REFERENCE',
    'SUPERSEDES',
    'RELATED',
    'ATTACHMENT'
);


--
-- Name: document_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_status AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'PENDING_APPROVAL',
    'APPROVED',
    'PUBLISHED',
    'REJECTED',
    'ARCHIVED',
    'EXPIRED'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'DOCUMENT_UPLOADED',
    'DOCUMENT_APPROVED',
    'DOCUMENT_REJECTED',
    'DOCUMENT_PUBLISHED',
    'COMMENT_ADDED',
    'COMMENT_REPLIED',
    'DOCUMENT_EXPIRED',
    'ACCESS_GRANTED',
    'SYSTEM_MAINTENANCE',
    'USER_MENTIONED'
);


--
-- Name: calculate_popularity_score(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_popularity_score(p_view_count integer, p_download_count integer, p_comment_count integer) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  -- Logarithmic scale to prevent outliers
  -- Downloads weighted 2x, comments 1.5x
  RETURN 1 + log(1 + p_view_count + (p_download_count * 2) + (p_comment_count * 1.5));
END;
$$;


--
-- Name: documents_search_rank(tsvector, text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.documents_search_rank(doc_search_vector tsvector, doc_status text, doc_view_count integer, doc_download_count integer, query_text text) RETURNS real
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT 
    ts_rank_cd(
      doc_search_vector, 
      websearch_to_tsquery('indonesian', query_text),
      32 /* normalization option for document length */
    ) * 
    -- Boost by popularity (logarithmic to prevent outliers)
    (1 + log(1 + doc_view_count + doc_download_count * 2)) * 
    -- Boost by status
    (CASE 
      WHEN doc_status = 'PUBLISHED' THEN 1.5
      WHEN doc_status = 'APPROVED' THEN 1.3
      WHEN doc_status = 'REVIEWED' THEN 1.1
      ELSE 1.0
    END)
$$;


--
-- Name: FUNCTION documents_search_rank(doc_search_vector tsvector, doc_status text, doc_view_count integer, doc_download_count integer, query_text text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.documents_search_rank(doc_search_vector tsvector, doc_status text, doc_view_count integer, doc_download_count integer, query_text text) IS 'Calculate search relevance score with popularity and status weighting';


--
-- Name: documents_search_vector_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.documents_search_vector_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('indonesian', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.file_name, '')), 'C') ||
    setweight(to_tsvector('indonesian', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.extracted_text, '')), 'D');
  RETURN NEW;
END
$$;


--
-- Name: get_search_suggestions(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_search_suggestions(query_prefix text, max_results integer DEFAULT 10) RETURNS TABLE(suggestion text, frequency bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT 
    word AS suggestion,
    COUNT(*) AS frequency
  FROM (
    -- Extract words from titles and strip special characters
    SELECT regexp_replace(
      lower(unnest(string_to_array(title, ' '))),
      '[^a-z0-9]',
      '',
      'g'
    ) AS word
    FROM documents
    WHERE status IN ('PUBLISHED', 'APPROVED')
    UNION ALL
    -- Extract words from tags and strip special characters
    SELECT regexp_replace(
      lower(unnest(tags)),
      '[^a-z0-9]',
      '',
      'g'
    ) AS word
    FROM documents
    WHERE status IN ('PUBLISHED', 'APPROVED')
  ) words
  WHERE word LIKE query_prefix || '%'
    AND length(word) > 2
    AND word != ''  -- Exclude empty strings after stripping
  GROUP BY word
  ORDER BY frequency DESC, word
  LIMIT max_results
$$;


--
-- Name: FUNCTION get_search_suggestions(query_prefix text, max_results integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_search_suggestions(query_prefix text, max_results integer) IS 'Get autocomplete suggestions based on document titles and tags (strips special characters for better matching)';


--
-- Name: get_status_boost(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_status_boost(p_status text) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN CASE 
    WHEN p_status = 'PUBLISHED' THEN 1.5
    WHEN p_status = 'APPROVED' THEN 1.3
    WHEN p_status = 'REVIEWED' THEN 1.1
    ELSE 1.0
  END;
END;
$$;


--
-- Name: refresh_search_scores(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_search_scores() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Upsert scores for all documents
  INSERT INTO document_search_scores (
    document_id,
    popularity_score,
    status_boost,
    view_count,
    download_count,
    comment_count,
    last_updated
  )
  SELECT 
    d.id,
    calculate_popularity_score(
      d.view_count,
      d.download_count,
      COALESCE(comment_counts.count, 0)
    ),
    get_status_boost(d.status::TEXT),
    d.view_count,
    d.download_count,
    COALESCE(comment_counts.count, 0),
    CURRENT_TIMESTAMP
  FROM documents d
  LEFT JOIN (
    SELECT document_id, COUNT(*) as count
    FROM comments
    GROUP BY document_id
  ) comment_counts ON d.id = comment_counts.document_id
  ON CONFLICT (document_id) DO UPDATE SET
    popularity_score = EXCLUDED.popularity_score,
    status_boost = EXCLUDED.status_boost,
    view_count = EXCLUDED.view_count,
    download_count = EXCLUDED.download_count,
    comment_count = EXCLUDED.comment_count,
    last_updated = CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;


--
-- Name: search_documents_with_ranking(text, text[], text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_documents_with_ranking(p_query text, p_status text[] DEFAULT NULL::text[], p_document_type_id text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS TABLE(document_id text, title text, description text, status text, relevance_score numeric, view_count integer, download_count integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.description,
    d.status::TEXT,
    -- Calculate relevance: text match boost * popularity * status
    (
      CASE 
        -- Title exact match: 3x boost
        WHEN LOWER(d.title) = LOWER(p_query) THEN 3.0
        -- Title starts with query: 2x boost
        WHEN LOWER(d.title) LIKE LOWER(p_query) || '%' THEN 2.0
        -- Title contains query: 1.5x boost
        WHEN LOWER(d.title) LIKE '%' || LOWER(p_query) || '%' THEN 1.5
        -- Description contains: 1x boost
        WHEN LOWER(COALESCE(d.description, '')) LIKE '%' || LOWER(p_query) || '%' THEN 1.0
        -- Tags contain: 1.2x boost
        WHEN EXISTS (
          SELECT 1 FROM unnest(d.tags) AS tag 
          WHERE LOWER(tag) LIKE '%' || LOWER(p_query) || '%'
        ) THEN 1.2
        ELSE 0.5
      END
      * COALESCE(s.popularity_score, 1.0)
      * COALESCE(s.status_boost, 1.0)
    ) AS relevance_score,
    d.view_count,
    d.download_count
  FROM documents d
  LEFT JOIN document_search_scores s ON d.id = s.document_id
  WHERE 
    (
      LOWER(d.title) LIKE '%' || LOWER(p_query) || '%'
      OR LOWER(COALESCE(d.description, '')) LIKE '%' || LOWER(p_query) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(d.tags) AS tag 
        WHERE LOWER(tag) LIKE '%' || LOWER(p_query) || '%'
      )
    )
    AND (p_status IS NULL OR d.status = ANY(p_status))
    AND (p_document_type_id IS NULL OR d.document_type_id = p_document_type_id)
  ORDER BY relevance_score DESC, d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: update_document_search_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_document_search_score() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO document_search_scores (
    document_id,
    popularity_score,
    status_boost,
    view_count,
    download_count,
    comment_count
  )
  SELECT 
    NEW.id,
    calculate_popularity_score(
      NEW.view_count,
      NEW.download_count,
      (SELECT COUNT(*) FROM comments WHERE document_id = NEW.id)
    ),
    get_status_boost(NEW.status::TEXT),
    NEW.view_count,
    NEW.download_count,
    (SELECT COUNT(*) FROM comments WHERE document_id = NEW.id)
  ON CONFLICT (document_id) DO UPDATE SET
    popularity_score = EXCLUDED.popularity_score,
    status_boost = EXCLUDED.status_boost,
    view_count = EXCLUDED.view_count,
    download_count = EXCLUDED.download_count,
    comment_count = EXCLUDED.comment_count,
    last_updated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _GroupToMenu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_GroupToMenu" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    action character varying(50) NOT NULL,
    resource character varying(50) NOT NULL,
    resource_id character varying(255) NOT NULL,
    actor_id text NOT NULL,
    details text,
    ip_address character varying(45),
    user_agent text,
    metadata text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id text NOT NULL,
    document_id text NOT NULL,
    parent_id text,
    user_id text NOT NULL,
    content text NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    edited_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: divisi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.divisi (
    id text NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    parent_id text,
    head_id text
);


--
-- Name: document_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_activities (
    id text NOT NULL,
    document_id text NOT NULL,
    user_id text NOT NULL,
    action public.activity_action NOT NULL,
    description text,
    ip_address inet,
    user_agent text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_history (
    id text NOT NULL,
    document_id text NOT NULL,
    action character varying(50) NOT NULL,
    field_changed character varying(100),
    old_value text,
    new_value text,
    status_from public.document_status,
    status_to public.document_status,
    changed_by_id text NOT NULL,
    change_reason text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_relations (
    id text NOT NULL,
    parent_id text NOT NULL,
    child_id text NOT NULL,
    relation_type public.document_relation_type DEFAULT 'PARENT_CHILD'::public.document_relation_type NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_search_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_search_scores (
    document_id text NOT NULL,
    popularity_score numeric DEFAULT 0,
    status_boost numeric DEFAULT 1.0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    comment_count integer DEFAULT 0
);


--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_versions (
    id text NOT NULL,
    document_id text NOT NULL,
    version character varying(50) NOT NULL,
    changes text,
    file_name character varying(500) NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    previous_version character varying(50),
    created_by_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    parent_version_id text
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id text NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    file_name character varying(500) NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    file_type character varying(100),
    mime_type character varying(100),
    version character varying(50) DEFAULT '1.0'::character varying NOT NULL,
    status public.document_status DEFAULT 'DRAFT'::public.document_status NOT NULL,
    access_groups text[],
    download_count integer DEFAULT 0 NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    tags text[],
    metadata jsonb,
    published_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    document_type_id text NOT NULL,
    created_by_id text NOT NULL,
    updated_by_id text,
    approved_by_id text,
    approved_at timestamp(3) without time zone,
    extracted_text text,
    extracted_at timestamp(3) without time zone,
    extraction_status character varying(20) DEFAULT 'pending'::character varying,
    hierarchy_level integer DEFAULT 0 NOT NULL,
    hierarchy_path character varying(500),
    parent_document_id text,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: COLUMN documents.extracted_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documents.extracted_text IS 'Extracted text content from PDF files';


--
-- Name: COLUMN documents.extraction_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documents.extraction_status IS 'Status of PDF text extraction: pending, processing, completed, failed, not_applicable';


--
-- Name: documents_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents_type (
    id text NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    description text,
    icon character varying(100),
    color character varying(50),
    access_level integer DEFAULT 1 NOT NULL,
    required_approval boolean DEFAULT false NOT NULL,
    retention_period integer,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu (
    id text NOT NULL,
    name character varying(200) NOT NULL,
    url character varying(500),
    icon character varying(100),
    parent_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    access_groups text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    title character varying(500) NOT NULL,
    message text,
    type public.notification_type DEFAULT 'DOCUMENT_UPLOADED'::public.notification_type NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    module character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    resource character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ppd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppd (
    id text NOT NULL,
    user_id text NOT NULL,
    divisi_id text NOT NULL,
    document_type_ids text[],
    is_active boolean DEFAULT true NOT NULL,
    assigned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by_id text NOT NULL
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    path character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id character varying(50),
    required_capability character varying(100),
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: role_capabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_capabilities (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(50),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: role_capability_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_capability_assignments (
    role_id text NOT NULL,
    capability_id text NOT NULL,
    assigned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id text NOT NULL,
    role_id text NOT NULL,
    permission_id text NOT NULL,
    is_granted boolean DEFAULT true NOT NULL,
    source character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    session_token text NOT NULL,
    user_id text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id text NOT NULL,
    key character varying(200) NOT NULL,
    value text,
    data_type character varying(50) NOT NULL,
    category character varying(100),
    description text,
    is_editable boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id text NOT NULL,
    user_id text,
    action public.activity_action NOT NULL,
    entity character varying(100),
    entity_id text,
    description text,
    ip_address inet,
    user_agent text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id text NOT NULL,
    user_id text NOT NULL,
    role_id text NOT NULL,
    assigned_by text NOT NULL,
    assigned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone,
    is_active boolean DEFAULT true NOT NULL,
    is_manually_assigned boolean DEFAULT false NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    group_id text,
    divisi_id text,
    department character varying(100),
    email_verified_at timestamp(3) without time zone,
    last_login_at timestamp(3) without time zone,
    phone character varying(20),
    "position" character varying(100),
    external_id character varying(50),
    external_source character varying(50),
    is_external boolean DEFAULT false NOT NULL,
    last_sync_at timestamp(3) without time zone,
    metadata jsonb,
    must_change_password boolean DEFAULT false NOT NULL
);


--
-- Name: workflow_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_transitions (
    id text NOT NULL,
    from_status character varying(50) NOT NULL,
    to_status character varying(50) NOT NULL,
    min_level integer NOT NULL,
    required_permission character varying(100),
    description text,
    allowed_by_label character varying(200),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: _GroupToMenu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."_GroupToMenu" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
986ac735-e236-4901-81a9-269b063619c2	6f78ac431438592c7a9c3280c83bf325511852dd697c243b7291471268d1592a	2026-01-02 12:47:44.656408+00	20251021080820_add_user_role_permission_system	\N	\N	2026-01-02 12:47:44.581196+00	1
22447144-c420-45d9-89c7-c0d7b236de15	b8cf7ef56d9a8ad02c69baebb814ff5d3244e8c3445fdee609957f0da75d329b	2026-01-02 12:47:44.705984+00	20251124044140_update_group_schema	\N	\N	2026-01-02 12:47:44.65769+00	1
69218eef-c064-4ad9-8542-fb0b182239be	12db3def0cd276c3e1f06737b2dc16505a79df482372a1103573d515ccdabb02	2026-01-02 12:47:44.711232+00	20251124050302_remove_group_permissions	\N	\N	2026-01-02 12:47:44.707266+00	1
cc9ae913-8218-48f1-9faa-554d6364777e	71a5c6872ac566aa9f67d72a5f253ce25eb72dd05956ed8c1a10f994ad41c36a	2026-01-02 12:47:44.720795+00	20251202091120_add_document_history	\N	\N	2026-01-02 12:47:44.712236+00	1
7dc0aee7-baa0-4113-a4ed-b88eb843dddf	43468fc46b1af021af60d71960ad5d93b176aee39e7d048a187e20b7926194f7	2026-01-02 12:47:44.738936+00	20251222173159_add_role_capabilities_and_workflow_transitions	\N	\N	2026-01-02 12:47:44.721938+00	1
9906b352-71b4-442b-ba70-f7ef0d856a84	14fda8c29acb73cb4497ce8ade1ed3c4e52bc3049d1bcc9b20f7b9aeb28303d4	2026-01-02 12:47:44.741864+00	20251225172448_add_permission_source_tracking	\N	\N	2026-01-02 12:47:44.740029+00	1
7c79bd1f-f442-46ef-acb8-ed9fde5f0a3f	f8035775eb50236778a0eb50432d380255c3d603395903f563a9712608ad2701	2026-01-02 12:47:44.744952+00	20251225225843_remove_group_level_field	\N	\N	2026-01-02 12:47:44.742825+00	1
503573b4-198f-4ea6-bcf9-daba38555afd	59d85babd763d0f390bf4430069f0e48df7bb6b44219bd03788248bf2f16e7c0	2026-01-02 12:47:44.754098+00	20251226085754_add_resources_table	\N	\N	2026-01-02 12:47:44.74594+00	1
bad7f805-ef09-4e12-a119-c2a546d58971	ccae8e366eab2c1bf0b9f4e77a0b3e3d186a78e1526709a11f3cf81144b4b892	2026-01-02 12:47:44.764385+00	20251228132552_add_fulltext_search	\N	\N	2026-01-02 12:47:44.755353+00	1
82e8d6a7-9fe0-49a7-b1c1-b246f5c86f16	f1fc53474777feabc07e7c3f41688561b1dce6a23cac801c8e2e9a47731ec0b0	2026-01-02 12:47:44.782335+00	20260102031428_remove_deprecated_permission_tables	\N	\N	2026-01-02 12:47:44.765682+00	1
aacb1250-ef11-4b38-af35-c9a99f48551a	c8905653b2cd533fbd4256ea2ffb1814ef3184324adc00a943065bef9fde2548	2026-01-02 12:47:44.78521+00	20260102033602_remove_role_level_field	\N	\N	2026-01-02 12:47:44.783239+00	1
dc9945e3-cea6-4fe7-a02c-ecef02f21a62	9ff2adf3535d5cf55be740d170ad66f6d11bb75f3fe735bca44ce239c267b960	2026-01-02 12:47:44.788292+00	20260102124011_remove_is_public_field	\N	\N	2026-01-02 12:47:44.785938+00	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, action, resource, resource_id, actor_id, details, ip_address, user_agent, metadata, created_at) FROM stdin;
cmjwvv76n00019amyn5te4kjo	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 13:01:55.871
cmjww4cff0003vucxu6lxs8ji	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"admin@dsm.com","reason":"Invalid password"}	2026-01-02 13:09:02.571
cmjww4hwn0005vucxbs3v05s2	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 13:09:09.671
cmjwwahr90007vucxkkozx8tz	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 13:13:49.413
cmjwwku7f0009vucxqlqsx53y	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 13:21:52.107
cmjwy39n7000bvucxz892xepo	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 14:04:11.536
cmjwy786800017lh0pzpmbcjf	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 14:07:16.256
cmjwy9jq200017l0xz433jucb	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 14:09:04.538
cmjwytgi90001hl7x2845d50q	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 14:24:33.489
cmjwznla600013zuwahmtj16p	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 14:47:59.358
cmjx0dltk0003fuis8rh4ey0n	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 15:08:13.111
cmjx1g8gf0001i3ds1retp6lt	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 15:38:15.374
cmjx1uo090007i3dsif2rjw4f	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 15:49:28.71
cmjx23opq0001c9ncipn1qcm0	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-02 15:56:29.533
cmjy6zj8900019xp6ru5veacu	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 11:01:00.058
cmjy7wnop0001lexet1ed6jnr	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 11:26:45.479
cmjy7ws6a0003lexeuajeg48d	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 11:26:51.297
cmjy8p1mp0005lexe76puboa8	LOGIN_FAILED	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"tik@dsm.com","reason":"Invalid password"}	2026-01-03 11:48:49.919
cmjy8p4ci0007lexesl64icnu	LOGIN_FAILED	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"tik@dsm.com","reason":"Invalid password"}	2026-01-03 11:48:53.442
cmjy8p7lv0009lexe2r9w47ox	LOGIN_FAILED	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"tik@dsm.com","reason":"Invalid password"}	2026-01-03 11:48:57.667
cmjy8pf8y000blexeroay6gkt	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"ppd@dsm.com"}	\N	\N	{"email":"ppd@dsm.com"}	2026-01-03 11:49:07.571
cmjy8r2wm000dlexe45xkz9eu	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"finance@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"finance@dsm.com","reason":"Invalid password"}	2026-01-03 11:50:24.885
cmjy8r5lr000flexebywpm1ob	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"finance@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"finance@dsm.com","reason":"Invalid password"}	2026-01-03 11:50:28.383
cmjy8r76a000hlexe2q39ilzu	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"finance@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"finance@dsm.com","reason":"Invalid password"}	2026-01-03 11:50:30.419
cmjy8u2sf0003mhjfvyklr8h6	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"finance@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"finance@dsm.com","reason":"Invalid password"}	2026-01-03 11:52:44.704
cmjy8uj810005mhjfffhavhnj	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"finance@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"finance@dsm.com","reason":"Invalid password"}	2026-01-03 11:53:06.001
cmjy8x8kq0001xzkl313zzf1b	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"finance@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"finance@dsm.com","reason":"Invalid password"}	2026-01-03 11:55:12.168
cmjy8yqmk0003xzklipdfrl5b	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"admin@dsm.com","reason":"Invalid password"}	2026-01-03 11:56:22.219
cmjy8ysre0005xzkliyp8scoi	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"admin@dsm.com","reason":"Invalid password"}	2026-01-03 11:56:24.986
cmjy8yylh0007xzklmrsclcdg	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"admin@dsm.com","reason":"Invalid password"}	2026-01-03 11:56:32.55
cmjy8z2s10009xzklmce8m61h	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 11:56:37.969
cmjy8ztzc000fxzklkgcw4ixo	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 11:57:13.224
cmjyaj09r000xi83ad4npuiwz	UPDATE	USER	cmjwvd13i0016k67yomlhj23c	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"finance","email":"finance@dsm.com","password":"finance123","firstName":"Finance","lastName":"Department","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"finance","email":"finance@dsm.com","password":"finance123","firstName":"Finance","lastName":"Department","isActive":true}}	2026-01-03 12:40:07.455
cmjyaj8ge000zi83alxasbhio	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"finance@dsm.com"}	\N	\N	{"email":"finance@dsm.com"}	2026-01-03 12:40:18.063
cmjyapkbt0011i83a7z6g9dta	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 12:45:13.384
cmjyasjta0013i83apiqxtg1m	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"047171189","reason":"Invalid password"}	\N	\N	{"email":"047171189","reason":"Invalid password"}	2026-01-03 12:47:32.685
cmjyasmps0015i83ap369ikll	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 12:47:36.448
cmjyauh3c001di83alq6ydyyb	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 12:49:02.472
cmjyb356b0001j52zrg3jnir7	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 12:55:46.93
cmjybxstq0001iqferacvqlw3	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 13:19:37.256
cmjyd0h2l0003iqfexrq75mto	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 13:49:41.612
cmjyfilw00001edkoot5jsyh2	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 14:59:46.894
cmjyfomhz0001kfi52a8u2bbr	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 15:04:27.622
cmjyg9a7g0013kfi59g2flaxv	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 15:20:31.468
cmjyg9n7g0015kfi53r61ddho	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 15:20:48.316
cmjyglkv600037qwof0ttiurb	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 15:30:05.154
cmjygwo7q000d7qwormdauarv	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 15:38:42.71
cmjygz8ax000h7qwowrykbcsi	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 15:40:42.056
cmjyh1aat000j7qwonmxp33kl	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 15:42:17.956
cmjyh22ny000l7qwob84amd5w	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 15:42:54.718
cmjyhmzfm00015prz2g3p2r0f	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 15:59:10.305
cmjyhp9zt00035przjh5gkeao	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 16:00:57.305
cmjyhqico00075przu19z5iwa	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 16:01:54.792
cmjyhr8yx00095przmapxeep6	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 16:02:29.289
cmjyhtqzf000b5przd8sof1m4	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-03 16:04:25.945
cmjyhw3zr000f5przzu3bgvf7	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 16:06:16.118
cmjyj14dc0001752xmt6kfjsk	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-03 16:38:09.504
cmjyjgxwk0001483a6rdvtdgf	UPDATE	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"ppd.pusat","email":"ppd.pusat@dsm.com","password":"ppdpusat","firstName":"Khalid","lastName":"-","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"ppd.pusat","email":"ppd.pusat@dsm.com","password":"ppdpusat","firstName":"Khalid","lastName":"-","isActive":true}}	2026-01-03 16:50:27.619
cmjyjhq4y0005483at552zyuw	ASSIGN	USER_ROLE	cmjwvd13i0015k67y5qg7w2qq-cmjyj9qtc0002752xjsxv05iv	cmjwvczk6000tk67yqfzvu89w	{"userId":"cmjwvd13i0015k67y5qg7w2qq","roleId":"cmjyj9qtc0002752xjsxv05iv","roleName":"ppd.pusat"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"userId":"cmjwvd13i0015k67y5qg7w2qq","roleId":"cmjyj9qtc0002752xjsxv05iv","roleName":"ppd.pusat"}	2026-01-03 16:51:04.21
cmjyji2680007483akhlovw0q	REVOKE	GROUP	cmjwvd13i0015k67y5qg7w2qq	cmjwvczk6000tk67yqfzvu89w	{"groupId":"cmjwvczap0004k67y2ltfecdg","groupName":"staff","action":"user_removed_from_group"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"groupId":"cmjwvczap0004k67y2ltfecdg","groupName":"staff","action":"user_removed_from_group"}	2026-01-03 16:51:19.808
cmjyjilos0009483awm9b73qp	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-03 16:51:45.101
cmjyjrg19000d483a2h7a8opg	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-03 16:58:37.676
cmjzs0rfp0001yrs1ul0i2di7	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 13:37:35.46
cmjzs1be80003yrs197mzcyrl	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 13:38:01.327
cmjzs3fl50005yrs1d3pwhmde	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-04 13:39:40.072
cmjzsln1o000byrs1mrr60xae	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 13:53:49.547
cmjzsuhur000dyrs1013r5i9k	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 14:00:42.723
cmjzv0l2b0001br210hwunj3v	LOGIN_FAILED	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat","reason":"Invalid password"}	\N	\N	{"email":"ppd.pusat","reason":"Invalid password"}	2026-01-04 15:01:26.051
cmjzv0xu80003br215a0cqeaf	LOGIN_FAILED	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"ppd.pusat@dsm.com","reason":"Invalid password"}	2026-01-04 15:01:42.609
cmjzv13nn0005br212acm364i	LOGIN_FAILED	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"ppd.pusat@dsm.com","reason":"Invalid password"}	2026-01-04 15:01:50.148
cmjzv1bwt0007br21tlro41rf	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 15:02:00.846
cmk0lcpxd000946qq9wp5oxiu	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:18:42.241
cmk0li9k60001mpqvk9bysqpt	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:23:00.965
cmjzv3suu0009br218tmebclj	UPDATE	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"ppd.pusat","email":"ppd.pusat@dsm.com","password":"ppdpusat","firstName":"Khalid","lastName":"-","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"ppd.pusat","email":"ppd.pusat@dsm.com","password":"ppdpusat","firstName":"Khalid","lastName":"-","isActive":true}}	2026-01-04 15:03:56.118
cmjzv45ad000bbr21jsjk216g	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 15:04:12.23
cmjzvoq0p0001voz9khmy4uc6	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 15:20:12.217
cmjzvp3to0003voz9ledblekl	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin","reason":"Invalid password"}	\N	\N	{"email":"admin","reason":"Invalid password"}	2026-01-04 15:20:30.108
cmjzvp9ma0005voz9rpjossax	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 15:20:37.619
cmjzvt9xd0001rprtcui0owy4	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 15:23:44.639
cmjzvx4ol0003rprtt48dbdu0	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 15:26:44.468
cmjzvxi090005rprtgyuzpse5	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 15:27:01.737
cmjzvxz130007rprtar15tnyd	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 15:27:23.799
cmjzw2p7l00014pc5o8w3v9iy	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 15:31:04.354
cmjzwgmbi0001wo7ow4xizr5k	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 15:41:53.788
cmjzwpyct0001wncldc0nmx0l	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-04 15:49:09.291
cmjzx2lov0005wnclmfcdmzk2	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"047171189","reason":"Invalid password"}	\N	\N	{"email":"047171189","reason":"Invalid password"}	2026-01-04 15:58:59.406
cmjzx3j5z0007wnclkbof0ovu	UPDATE	USER	cmjwvd13i0016k67yomlhj23c	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"047171189","email":"puas@dsm.com","password":"user123","firstName":"Puas","lastName":"Apriyampon","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"047171189","email":"puas@dsm.com","password":"user123","firstName":"Puas","lastName":"Apriyampon","isActive":true}}	2026-01-04 15:59:42.79
cmjzx3plv0009wnclmn28aspa	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-04 15:59:51.14
cmjzx80y7000hwncl12b59uah	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 16:03:12.462
cmjzxjdoo00016d70aj3dyvmc	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-04 16:12:02.183
cmk0gnhen0001j4k56mskq67n	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 01:07:06.334
cmk0hfv610008j4k5hirssxgb	ASSIGN	USER_ROLE	cmjwvd13i0017k67yccjxnpiz-cmk0hebmf0004j4k50pigl56k	cmjwvczk6000tk67yqfzvu89w	{"userId":"cmjwvd13i0017k67yccjxnpiz","roleId":"cmk0hebmf0004j4k50pigl56k","roleName":"ppd.unit"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"userId":"cmjwvd13i0017k67yccjxnpiz","roleId":"cmk0hebmf0004j4k50pigl56k","roleName":"ppd.unit"}	2026-01-05 01:29:10.537
cmk0hguzl000aj4k5w8camt6h	UPDATE	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"tik_user","email":"tik@dsm.com","password":"tik123","firstName":"TIK","lastName":"Staff","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"tik_user","email":"tik@dsm.com","password":"tik123","firstName":"TIK","lastName":"Staff","isActive":true}}	2026-01-05 01:29:56.961
cmk0hhjuq000ej4k5etarl8tp	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 01:30:29.187
cmk0irxsd000jetf44xubl6ha	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 02:06:33.42
cmk0it1df000letf4jw1ws3ud	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 02:07:24.723
cmk0jeysl000tetf4o0t8aox3	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 02:24:27.812
cmk0k6gyk00011wlypn43lpa4	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"047171189","reason":"Invalid password"}	\N	\N	{"email":"047171189","reason":"Invalid password"}	2026-01-05 02:45:51.067
cmk0k6m5k00031wlyji2b1vhg	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-05 02:45:57.8
cmk0kimgg0001nfhcx0v29zss	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 02:55:18.063
cmk0kwh4m000146qqr2txla8s	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:06:04.341
cmk0l4qar000346qqwfupt9ev	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:12:29.474
cmk0l6lis000546qqppe432n3	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:13:56.595
cmk0lb6qk000746qq0sbdwy73	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:17:30.717
cmk0ln3kh0001n4umljihysti	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:26:46.48
cmk0locbu0003n4um5mnrztpp	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:27:44.487
cmk0loqu30005n4umgbooyazf	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 03:28:03.291
cmk0m54op0007n4um1zdo28ek	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 03:40:47.736
cmk0mym580009n4umekuym1gb	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 04:03:43.388
cmk0mzpal000bn4um3kbh600z	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 04:04:34.125
cmk0nb8iq000dn4umavs9q14s	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 04:13:32.258
cmk0nf7jg000fn4umc8qu9hce	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 04:16:37.611
cmk0nkyq6000hn4umr8mlz6ur	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 04:21:06.126
cmk0nldio000jn4umg7jcoq09	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 04:21:25.295
cmk0nmao0000ln4umdaa6qlsd	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 04:22:08.257
cmk0nppb9000pn4umjg6xe21s	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 04:24:47.205
cmk0nzngi000rn4umkhojj1sq	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 04:32:31.362
cmk0o13sj000tn4umm2k2kymc	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 04:33:39.188
cmk0o1x7b000vn4umasuoshu6	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-05 04:34:17.303
cmk0o2696000xn4umk4q0md57	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 04:34:29.034
cmk0o3fyf000zn4umtv2t63gs	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 04:35:28.263
cmk0of41c0011n4umwsccksf3	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-05 04:44:32.688
cmk0ojf0i0013n4umhje0fn3r	UPDATE	USER	cmjwvd13i000yk67ysjtjp81d	cmjwvczk6000tk67yqfzvu89w	{"changes":{"isActive":false}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"isActive":false}}	2026-01-05 04:47:53.538
cmk0ojpjg0015n4um805tmrif	UPDATE	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvczk6000tk67yqfzvu89w	{"changes":{"isActive":false}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"isActive":false}}	2026-01-05 04:48:07.181
cmk0oqo250017n4umhgmn9m1f	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 04:53:31.852
cmk0t8z000019n4umjexeqnoc	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 06:59:44.301
cmk0taq1v001bn4umamxj96se	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 07:01:06.018
cmk0tbtt0001dn4umt247y1a6	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 07:01:57.539
cmk0tidxi0001ty8tnca4opz0	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-05 07:07:03.558
cmk0ugw3n0001n8w2acnk49fv	LOGIN_FAILED	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"tik@dsm.com","reason":"Invalid password"}	2026-01-05 07:33:53.41
cmk0ugzxl0003n8w2k3987apb	LOGIN_FAILED	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"tik@dsm.com","reason":"Invalid password"}	2026-01-05 07:33:58.377
cmk0uh7b10005n8w29o8boeut	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 07:34:07.934
cmk0uhlqs0007n8w2yyme0v5c	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 07:34:26.643
cmk0unjqy0009n8w2kwd8i1fd	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 07:39:03.992
cmk0w4hes000bn8w2tixo1f3c	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 08:20:13.732
cmk0wc2g9000dn8w2ffmu9tgk	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 08:26:07.59
cmk0weqds000fn8w27q032j3z	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 08:28:11.919
cmk0wn49d0001jyagruetsd10	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-05 08:34:43.152
cmk0wyq23000110sp8o1gd4ow	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 08:43:44.617
cmk0x1yof000310spgvyayxaf	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-05 08:46:15.759
cmk0x2m7g000510spknl46k0d	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-05 08:46:46.251
cmk0x9n3y0001q8bkiz7i7zmy	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-05 08:52:14.014
cmk0xrkd60001i91hgxlm4l6w	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 09:06:10.265
cmk3hkxzx002lak715d8w3qam	LOGIN	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	\N	\N	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	2026-01-07 03:56:26.014
cmk0xtpg10003i91hgoxfmigg	UPDATE	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"043410176","email":"043410176@dsm.com","password":"043410176","firstName":"Fanny","lastName":"-","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"043410176","email":"043410176@dsm.com","password":"043410176","firstName":"Fanny","lastName":"-","isActive":true}}	2026-01-05 09:07:50.161
cmk0xtxyk0007i91hp2lj7997	ASSIGN	USER_ROLE	cmjwvd13i0011k67yhnsrcfug-cmk0xnf420000e0e0kcf86207	cmjwvczk6000tk67yqfzvu89w	{"userId":"cmjwvd13i0011k67yhnsrcfug","roleId":"cmk0xnf420000e0e0kcf86207","roleName":"asisten.manager.pksm"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"userId":"cmjwvd13i0011k67yhnsrcfug","roleId":"cmk0xnf420000e0e0kcf86207","roleName":"asisten.manager.pksm"}	2026-01-05 09:08:01.196
cmk0xu3ok0009i91hbgg50n3l	REVOKE	GROUP	cmjwvd13i0011k67yhnsrcfug	cmjwvczk6000tk67yqfzvu89w	{"groupId":"cmjwvczai0001k67y8myr0k7g","groupName":"ppd","action":"user_removed_from_group"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"groupId":"cmjwvczai0001k67y8myr0k7g","groupName":"ppd","action":"user_removed_from_group"}	2026-01-05 09:08:08.612
cmk0xvzp4000bi91h6l16zr5g	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:09:36.759
cmk0yonwt0001uqgdm4cmyti9	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:31:54.509
cmk0ypa1b0005uqgdgjaycphd	ASSIGN	USER_ROLE	cmjwvd13i0011k67yhnsrcfug-cmk0xnf420000e0e0kcf86207	cmjwvczk6000tk67yqfzvu89w	{"userId":"cmjwvd13i0011k67yhnsrcfug","roleId":"cmk0xnf420000e0e0kcf86207","roleName":"asisten.manager.pksm"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"userId":"cmjwvd13i0011k67yhnsrcfug","roleId":"cmk0xnf420000e0e0kcf86207","roleName":"asisten.manager.pksm"}	2026-01-05 09:32:23.183
cmk0ypkjo0007uqgdnj22o9qn	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:32:36.805
cmk0yspps000111n3xvx39t8r	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:35:03.47
cmk0yu37j000311n3fb2yfneu	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-05 09:36:07.614
cmk0yuzze000511n3s0docmcg	UPDATE	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"043410176","email":"043410176@dsm.com","password":"043410176","firstName":"Fanny","lastName":"-","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"043410176","email":"043410176@dsm.com","password":"043410176","firstName":"Fanny","lastName":"-","isActive":true}}	2026-01-05 09:36:50.09
cmk0yvjtu000711n3xgujkkjd	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:37:15.81
cmk0yw07n000911n3gacp3voj	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-05 09:37:37.044
cmk0z0qs9000b11n3h4pz71fr	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:41:18.104
cmk0z2vgw000d11n3d6fn3w30	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-05 09:42:57.485
cmk0z3s72000f11n36yqjczt6	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:43:39.902
cmk0z4dtz000h11n3eq8mds9g	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:44:07.942
cmk0z55jd000j11n3mzwx5lg0	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:44:43.849
cmk0z721o000l11n3jxpb0ie0	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:46:12.635
cmk0ziey100011atzhbypueiv	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:55:02.567
cmk0ziw6600031atzx9oa52rt	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-05 09:55:24.892
cmk0zk19600051atzhvhdwbed	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-05 09:56:18.138
cmk1ytlvm0001ak4nrp11itk7	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 02:23:31.33
cmk1ywc2k0003ak4n6jdwxma2	LOGIN	USER	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	{"email":"tik@dsm.com"}	\N	\N	{"email":"tik@dsm.com"}	2026-01-06 02:25:38.588
cmk1yx40e0005ak4neccd3avr	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-06 02:26:14.798
cmk1yzywe0007ak4ne1zxb5xn	UPDATE	USER	cmjwvd13i000yk67ysjtjp81d	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"manager_user","email":"manager@dsm.com","password":"manager213","firstName":"Manager","lastName":"User","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"manager_user","email":"manager@dsm.com","password":"manager213","firstName":"Manager","lastName":"User","isActive":true}}	2026-01-06 02:28:28.142
cmk1znya80009ak4nngtawgg0	REVOKE	GROUP	cmjwvd13i000yk67ysjtjp81d	cmjwvczk6000tk67yqfzvu89w	{"groupId":"cmjwvczat000bk67ybnzkqrq8","groupName":"manager","action":"user_removed_from_group"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"groupId":"cmjwvczat000bk67ybnzkqrq8","groupName":"manager","action":"user_removed_from_group"}	2026-01-06 02:47:07.088
cmk1zo9yg000bak4nlemxsc9r	REVOKE	GROUP	cmjwvd13i000zk67y38y267mg	cmjwvczk6000tk67yqfzvu89w	{"groupId":"cmjwvczat000ck67ydhlp8obl","groupName":"kadiv","action":"user_removed_from_group"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"groupId":"cmjwvczat000ck67ydhlp8obl","groupName":"kadiv","action":"user_removed_from_group"}	2026-01-06 02:47:22.217
cmk1zpwfq000gak4n7qdri152	ASSIGN	USER_ROLE	cmjwvd13i000zk67y38y267mg-cmk1zpj8w000cak4n2ht5csm9	cmjwvczk6000tk67yqfzvu89w	{"userId":"cmjwvd13i000zk67y38y267mg","roleId":"cmk1zpj8w000cak4n2ht5csm9","roleName":"kadiv pksm"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"userId":"cmjwvd13i000zk67y38y267mg","roleId":"cmk1zpj8w000cak4n2ht5csm9","roleName":"kadiv pksm"}	2026-01-06 02:48:38.006
cmk1zvoqb000iak4nueq99qgo	UPDATE	USER	cmjwvd13i000zk67y38y267mg	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"kadiv","email":"kadiv@dsm.com","password":"kadiv123","firstName":"Kepala","lastName":"Divisi","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"kadiv","email":"kadiv@dsm.com","password":"kadiv123","firstName":"Kepala","lastName":"Divisi","isActive":true}}	2026-01-06 02:53:07.955
cmk1zvxgw000kak4nsuysnair	LOGIN	USER	cmjwvd13i000zk67y38y267mg	cmjwvd13i000zk67y38y267mg	{"email":"kadiv@dsm.com"}	\N	\N	{"email":"kadiv@dsm.com"}	2026-01-06 02:53:19.28
cmk23fnvq000mak4n1tcqzbz7	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 04:32:38.82
cmk25srx6000oak4ni415w0e3	LOGIN	USER	cmjwvd13i000zk67y38y267mg	cmjwvd13i000zk67y38y267mg	{"email":"kadiv@dsm.com"}	\N	\N	{"email":"kadiv@dsm.com"}	2026-01-06 05:38:49.815
cmk26cqf4000qak4nm7om9fy4	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 05:54:20.992
cmk26dhcf000sak4n55dqsztt	READ	USER		cmjwvczk6000tk67yqfzvu89w	{"action":"System configurations viewed"}	\N	\N	{"action":"System configurations viewed"}	2026-01-06 05:54:55.887
cmk26ed1z000uak4nl1qsvjhx	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-06 05:55:36.983
cmk28dfp9000wak4nxl2205pe	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin","reason":"Invalid password"}	\N	\N	{"email":"admin","reason":"Invalid password"}	2026-01-06 06:50:52.987
cmk28dh6v000yak4nf54a0al8	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin","reason":"Invalid password"}	\N	\N	{"email":"admin","reason":"Invalid password"}	2026-01-06 06:50:54.919
cmk28djho0010ak4na1j5phd9	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin","reason":"Invalid password"}	\N	\N	{"email":"admin","reason":"Invalid password"}	2026-01-06 06:50:57.901
cmk28dsx20012ak4nvnf2d5l8	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 06:51:10.118
cmk28eb4f0014ak4na03cykfj	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 06:51:33.711
cmk28fu5o0016ak4n5ikdh7tl	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 06:52:45.036
cmk28gba70018ak4nkl6qg21n	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 06:53:07.231
cmk28nb0u001aak4nyx1tz8k5	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-06 06:58:33.485
cmk28qdno001cak4nvshvaxtf	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-06 07:00:56.868
cmk28r2f4001eak4nvn8g37hq	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-06 07:01:28.96
cmk28rc9y001iak4n0fvo92p9	LOGIN_FAILED	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176","reason":"Invalid password"}	\N	\N	{"email":"043410176","reason":"Invalid password"}	2026-01-06 07:01:41.734
cmk28rd9q001kak4nqv42kdhv	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-06 07:01:43.022
cmk28rhcy001mak4nuhj5ryxa	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-06 07:01:48.322
cmk28rx61001oak4n3ce78o5n	LOGIN_FAILED	USER	cmjwvd13i000yk67ysjtjp81d	cmjwvd13i000yk67ysjtjp81d	{"email":"manager@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"manager@dsm.com","reason":"Invalid password"}	2026-01-06 07:02:08.809
cmk28s0i4001qak4nrnf6h1ig	LOGIN_FAILED	USER	cmjwvd13i000yk67ysjtjp81d	cmjwvd13i000yk67ysjtjp81d	{"email":"manager@dsm.com","reason":"Invalid password"}	\N	\N	{"email":"manager@dsm.com","reason":"Invalid password"}	2026-01-06 07:02:13.132
cmk28s6f6001sak4nf5wpyrhs	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-06 07:02:20.801
cmk28sum2001uak4nxmmt20e3	LOGIN_FAILED	USER	cmjwvd13i000yk67ysjtjp81d	cmjwvd13i000yk67ysjtjp81d	{"email":"manager_user","reason":"Invalid password"}	\N	\N	{"email":"manager_user","reason":"Invalid password"}	2026-01-06 07:02:52.154
cmk28t3zk001wak4ncmjbitif	UPDATE	USER	cmjwvd13i000yk67ysjtjp81d	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"manager_user","email":"manager@dsm.com","password":"manager123","firstName":"Manager","lastName":"User","isActive":true}}	::ffff:10.99.99.132	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"manager_user","email":"manager@dsm.com","password":"manager123","firstName":"Manager","lastName":"User","isActive":true}}	2026-01-06 07:03:04.304
cmk28t6ph001yak4no1i0czgi	LOGIN	USER	cmjwvd13i000yk67ysjtjp81d	cmjwvd13i000yk67ysjtjp81d	{"email":"manager@dsm.com"}	\N	\N	{"email":"manager@dsm.com"}	2026-01-06 07:03:07.829
cmk28twdo0020ak4nknrzrd5c	LOGIN	USER	cmjwvd13i000zk67y38y267mg	cmjwvd13i000zk67y38y267mg	{"email":"kadiv@dsm.com"}	\N	\N	{"email":"kadiv@dsm.com"}	2026-01-06 07:03:41.101
cmk28vsop0022ak4n6bk0w4rr	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-06 07:05:09.625
cmk3cg09s0026ak4nsmcajvaq	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 01:32:37.6
cmk3chluw0028ak4np95tna75	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-07 01:33:52.232
cmk3ckeb5002cak4nxdyhg8q4	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-07 01:36:02.416
cmk3fhp7k0001ak71gx7f34q1	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 02:57:55.423
cmk3fhtnd0003ak714c521hyx	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 02:58:01.178
cmk3ghkgc000qak711c6zjcci	LOGIN	USER	cmk3gc55i000gak71a49tauon	cmk3gc55i000gak71a49tauon	{"email":"wawan.suharwan@jasatirta2.co.id"}	\N	\N	{"email":"wawan.suharwan@jasatirta2.co.id"}	2026-01-07 03:25:48.876
cmk3gih9t000sak71euragflw	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 03:26:31.408
cmk3gsvn50011ak718b5qdi0r	LOGIN	USER	cmk3gsve3000xak71yb0k54eu	cmk3gsve3000xak71yb0k54eu	{"email":"agung.satria@jasatirta2.co.id"}	\N	\N	{"email":"agung.satria@jasatirta2.co.id"}	2026-01-07 03:34:36.594
cmk3gx6hv0016ak71ykuth01y	LOGIN	USER	cmk3gx69b0012ak71flm5zwyq	cmk3gx69b0012ak71flm5zwyq	{"email":"novia.anggun@jasatirta2.co.id"}	\N	\N	{"email":"novia.anggun@jasatirta2.co.id"}	2026-01-07 03:37:57.284
cmk3gxexv0018ak71o4b2olwy	LOGIN	USER	cmk3gx69b0012ak71flm5zwyq	cmk3gx69b0012ak71flm5zwyq	{"email":"novia.anggun@jasatirta2.co.id"}	\N	\N	{"email":"novia.anggun@jasatirta2.co.id"}	2026-01-07 03:38:08.228
cmk3gxto0001aak716pp6ixwb	LOGIN	USER	cmk3gx69b0012ak71flm5zwyq	cmk3gx69b0012ak71flm5zwyq	{"email":"novia.anggun@jasatirta2.co.id"}	\N	\N	{"email":"novia.anggun@jasatirta2.co.id"}	2026-01-07 03:38:27.313
cmk3gydot001cak71vtmb6u1r	LOGIN	USER	cmk3gsve3000xak71yb0k54eu	cmk3gsve3000xak71yb0k54eu	{"email":"agung.satria@jasatirta2.co.id"}	\N	\N	{"email":"agung.satria@jasatirta2.co.id"}	2026-01-07 03:38:53.262
cmk3gzxey001gak71rst5s3rh	LOGIN_FAILED	USER	cmk3gsve3000xak71yb0k54eu	cmk3gsve3000xak71yb0k54eu	{"email":"PWT2992500","reason":"Invalid password"}	\N	\N	{"email":"PWT2992500","reason":"Invalid password"}	2026-01-07 03:40:05.482
cmk3h07wx001iak710gwjbuun	LOGIN	USER	cmk3gsve3000xak71yb0k54eu	cmk3gsve3000xak71yb0k54eu	{"email":"agung.satria@jasatirta2.co.id"}	\N	\N	{"email":"agung.satria@jasatirta2.co.id"}	2026-01-07 03:40:19.089
cmk3h57xo001kak717apaii46	LOGIN	USER	cmk3gsve3000xak71yb0k54eu	cmk3gsve3000xak71yb0k54eu	{"email":"agung.satria@jasatirta2.co.id"}	\N	\N	{"email":"agung.satria@jasatirta2.co.id"}	2026-01-07 03:44:12.396
cmk3h5rl5001mak71k4ks5r0h	LOGIN	USER	cmk3gsve3000xak71yb0k54eu	cmk3gsve3000xak71yb0k54eu	{"email":"agung.satria@jasatirta2.co.id"}	\N	\N	{"email":"agung.satria@jasatirta2.co.id"}	2026-01-07 03:44:37.865
cmk3h9wt0001rak71m1hia2jw	LOGIN	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	\N	\N	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	2026-01-07 03:47:51.252
cmk3ha6qk001tak71pu1tixcn	LOGIN	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	\N	\N	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	2026-01-07 03:48:04.124
cmk3hbinr001xak71z2jzvw44	LOGIN_FAILED	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"PWT2972500","reason":"Invalid password"}	\N	\N	{"email":"PWT2972500","reason":"Invalid password"}	2026-01-07 03:49:06.231
cmk3hbtiw001zak71mpl9lucx	LOGIN	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	\N	\N	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	2026-01-07 03:49:20.313
cmk3hd39c0023ak71arw42e04	LOGIN	USER	cmk3gc55i000gak71a49tauon	cmk3gc55i000gak71a49tauon	{"email":"wawan.suharwan@jasatirta2.co.id"}	\N	\N	{"email":"wawan.suharwan@jasatirta2.co.id"}	2026-01-07 03:50:19.584
cmk3hdtgv0025ak71j6hx389c	LOGIN	USER	cmk3gc55i000gak71a49tauon	cmk3gc55i000gak71a49tauon	{"email":"wawan.suharwan@jasatirta2.co.id"}	\N	\N	{"email":"wawan.suharwan@jasatirta2.co.id"}	2026-01-07 03:50:53.552
cmk3hgcuh0027ak71sh8ke1n9	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 03:52:51.976
cmk3hgkgs0029ak719vhm5us2	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 03:53:01.853
cmk3hi4w5002dak71uqbm5lwd	LOGIN_FAILED	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin","reason":"Invalid password"}	\N	\N	{"email":"admin","reason":"Invalid password"}	2026-01-07 03:54:14.981
cmk3hklsl002fak71kwa4w5jd	LOGIN	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	\N	\N	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	2026-01-07 03:56:10.198
cmk3hkrye002jak71jk7gx9kh	LOGIN_FAILED	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"PWT2972500","reason":"Invalid password"}	\N	\N	{"email":"PWT2972500","reason":"Invalid password"}	2026-01-07 03:56:18.183
cmk3hq2pc002pak71lwa98eez	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 04:00:25.392
cmk3hqty2002tak71ra2ve0ss	ASSIGN	USER_ROLE	cmk3h9wjo001nak71q3mgd3bb-cmk0hebmf0004j4k50pigl56k	cmjwvczk6000tk67yqfzvu89w	{"userId":"cmk3h9wjo001nak71q3mgd3bb","roleId":"cmk0hebmf0004j4k50pigl56k","roleName":"ppd.unit"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"userId":"cmk3h9wjo001nak71q3mgd3bb","roleId":"cmk0hebmf0004j4k50pigl56k","roleName":"ppd.unit"}	2026-01-07 04:01:00.698
cmk3htigm002vak71n0vj07uo	UPDATE	GROUP	cmjwvczau000fk67yx9qjt75q	cmjwvczk6000tk67yqfzvu89w	{"changes":{"name":"sekper","changes":{"name":"sekper","displayName":"Sekretariat Perusahaan","description":"Departemen Sekper dengan akses ke dokumen dan peraturan"},"originalData":{"name":"hrd","displayName":"Human Resource Development","description":"Departemen SDM dengan akses ke dokumen kepegawaian, kebijakan, dan pengembangan karyawan"}}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"name":"sekper","changes":{"name":"sekper","displayName":"Sekretariat Perusahaan","description":"Departemen Sekper dengan akses ke dokumen dan peraturan"},"originalData":{"name":"hrd","displayName":"Human Resource Development","description":"Departemen SDM dengan akses ke dokumen kepegawaian, kebijakan, dan pengembangan karyawan"}}}	2026-01-07 04:03:05.781
cmk3htz6v002xak719mbzlhzf	ASSIGN	GROUP	cmk3h9wjo001nak71q3mgd3bb	cmjwvczk6000tk67yqfzvu89w	{"groupId":"cmjwvczau000fk67yx9qjt75q","groupName":"sekper","action":"user_assigned_to_group"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"groupId":"cmjwvczau000fk67yx9qjt75q","groupName":"sekper","action":"user_assigned_to_group"}	2026-01-07 04:03:27.464
cmk3hupp3002zak71xtxogsu6	LOGIN	USER	cmk3h9wjo001nak71q3mgd3bb	cmk3h9wjo001nak71q3mgd3bb	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	\N	\N	{"email":"annisa.ramadhanty@jasatirta2.co.id"}	2026-01-07 04:04:01.815
cmk3hwvme0038ak71i7cvzojf	LOGIN_FAILED	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"047171189","reason":"Invalid password"}	\N	\N	{"email":"047171189","reason":"Invalid password"}	2026-01-07 04:05:42.806
cmk3hx9n8003aak718j9ba8q1	UPDATE	USER	cmjwvd13i0016k67yomlhj23c	cmjwvczk6000tk67yqfzvu89w	{"changes":{"username":"047171189","email":"puas@dsm.com","password":"user1234","firstName":"Puas","lastName":"Apriyampon","isActive":true}}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	{"changes":{"username":"047171189","email":"puas@dsm.com","password":"user1234","firstName":"Puas","lastName":"Apriyampon","isActive":true}}	2026-01-07 04:06:00.98
cmk3hxdxl003hak71qwu0rieu	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-07 04:06:06.537
cmk3hxt0m003oak71o5blcmeo	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-07 04:06:26.087
cmk3ickvq003vak71blkhemu1	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-07 04:17:55.382
cmk3idqen0042ak71b0kix2c1	LOGIN	USER	cmjwvd13i0016k67yomlhj23c	cmjwvd13i0016k67yomlhj23c	{"email":"puas@dsm.com"}	\N	\N	{"email":"puas@dsm.com"}	2026-01-07 04:18:49.199
cmk3ifma10046ak71n33mfhux	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 04:20:17.16
cmk3ik8tb0001ak5qog70ohwz	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 04:23:52.989
cmk3ikfrd0003ak5q7edcjegn	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 04:24:01.993
cmk3ikolu0005ak5q80ouwbci	LOGIN	USER	cmk3gc55i000gak71a49tauon	cmk3gc55i000gak71a49tauon	{"email":"wawan.suharwan@jasatirta2.co.id"}	\N	\N	{"email":"wawan.suharwan@jasatirta2.co.id"}	2026-01-07 04:24:13.458
cmk3il3w10007ak5qlbtne6cm	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 04:24:33.265
cmk3trlh30001ak2aqz0u87bv	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 09:37:31.767
cmk3twi3d0001akizml6j1ngi	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 09:41:20.664
cmk474yfb0001ak1rhczclqnj	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 15:51:50.087
cmk475spa0003ak1re05uylny	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 15:52:29.325
cmk4764b40005ak1r0eevhas5	LOGIN_FAILED	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat","reason":"Invalid password"}	\N	\N	{"email":"ppd.pusat","reason":"Invalid password"}	2026-01-07 15:52:44.368
cmk476tgs0007ak1rmvjwtd6j	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 15:53:16.972
cmk48vnk50005aknp0ch7h57m	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-07 16:40:35.332
cmk4rsoco0009ak0tpk0xdwsx	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-08 01:30:09.095
cmk4tlgna0001aktsa7j1jd45	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-08 02:20:31.75
cmk4tqq5r0003akts5jzn7j1j	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-08 02:24:37.359
cmk4tzgd30005akts6ee7u3c0	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-08 02:31:24.566
cmk678ck50001akupp4u3o35p	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-09 01:30:00.724
cmk68i7ij0003akup6owo8fkc	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-09 02:05:40.363
cmk6n5emr0001akpki2iwkkwr	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-09 08:55:37.298
cmk8h8eri0001akrlyem6ahan	LOGIN	USER	cmjwvd13i000zk67y38y267mg	cmjwvd13i000zk67y38y267mg	{"email":"kadiv@dsm.com"}	\N	\N	{"email":"kadiv@dsm.com"}	2026-01-10 15:45:32.094
cmk8i2hy20001akkxu4l6scn7	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-10 16:08:55.898
cmk8kmn840001akljrz9flmfu	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-10 17:20:35.091
cmk8krtme0001ak4kn5beob72	LOGIN	USER	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	{"email":"ppd.pusat@dsm.com"}	\N	\N	{"email":"ppd.pusat@dsm.com"}	2026-01-10 17:24:36.662
cmk8kxs9o000cak4k7369btoc	LOGIN	USER	cmjwvd13i0011k67yhnsrcfug	cmjwvd13i0011k67yhnsrcfug	{"email":"043410176@dsm.com"}	\N	\N	{"email":"043410176@dsm.com"}	2026-01-10 17:29:14.844
cmk8kzai9000lak4k1yzxgac7	LOGIN	USER	cmjwvd13i000zk67y38y267mg	cmjwvd13i000zk67y38y267mg	{"email":"kadiv@dsm.com"}	\N	\N	{"email":"kadiv@dsm.com"}	2026-01-10 17:30:25.138
cmkm8imt30016akwoe5cqodpe	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-20 06:50:18.998
cmkm8vfci0018akwottxwlpj3	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-20 07:00:15.857
cmkm8y83v001aakwoir9eubdp	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-20 07:02:26.443
cmkmc3e070001akthzawkyufk	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-20 08:30:26.215
cmkncr8yc0003akwwtzfpupns	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-21 01:36:45.586
cmkndrbmv0005akwwt12ut2qp	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-21 02:04:48.679
cmkuha8v20001akyf7xzv96jp	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 01:17:53.63
cmkukkv5c0001ak8e6ogqhbn5	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 02:50:07.92
cmkukl4md0003ak8ey6uz81sr	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 02:50:20.196
cmkukl8hz0005ak8e612jpoml	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 02:50:25.223
cmkulw6y70007akhp9kimec0y	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 03:26:56.045
cmkumsz1l000hakhpq3znmpia	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 03:52:25.448
cmkun945o000jakhpqcnntzn8	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 04:04:58.571
cmkupey9m0003ak0dwng2t1t6	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 05:05:30.107
cmkupmkg1000bak0df1oqrgso	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 05:11:25.441
cmkupmrmo000fak0dd5dfnkc7	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 05:11:34.753
cmkupok0s000hak0dkfmt5qfd	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 05:12:58.204
cmkupsn8k000rak0d7rv278xp	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-01-26 05:16:08.996
cmltpaz880001akmsag65b4qf	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-02-19 16:54:20.888
cmlv1hkzs0001akpurmtztha4	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-02-20 15:23:10.6
cmlv53aff0005ak0ugiive1yr	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-02-20 17:04:02.187
cmnoaj3od0001akjj9l7qcp6x	LOGIN	USER	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	{"email":"admin@dsm.com"}	\N	\N	{"email":"admin@dsm.com"}	2026-04-07 07:21:19.454
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, document_id, parent_id, user_id, content, is_edited, edited_at, created_at, updated_at) FROM stdin;
cmjx1e3qq004p9kwjto3fgat5	seed-doc-1	\N	cmjwvd13i0011k67yhnsrcfug	Dokumen ini sangat lengkap dan jelas. Bagus untuk referensi implementasi ISO.	f	\N	2024-01-16 11:00:00	2026-01-02 15:36:35.955
cmjx1e3qr004t9kwjlfzt2zvz	seed-doc-3	\N	cmjwvd13i0011k67yhnsrcfug	Mohon tambahkan checklist untuk regression testing di bagian 4.2	f	\N	2024-02-16 10:30:00	2026-01-02 15:36:35.955
cmjx1e3qr004w9kwjk4gqgmd6	seed-doc-10	\N	cmjwvd13i0011k67yhnsrcfug	Proposal ini menarik. Tolong tambahkan analisis cost-benefit yang lebih detail di section 5.	f	\N	2024-03-02 10:00:00	2026-01-02 15:36:35.955
cmjx1e3qr004x9kwjgdqqxskr	seed-doc-3	\N	cmjwvd13i0017k67yccjxnpiz	Akan saya tambahkan, terima kasih untuk review-nya.	f	\N	2024-02-16 14:00:00	2026-01-02 15:36:35.955
cmjx1e3qr004y9kwjv3hcnphs	seed-doc-7	\N	cmjwvczk6000tk67yqfzvu89w	Perlu ditambahkan guidelines untuk keamanan data saat kerja remote.	f	\N	2024-02-28 17:00:00	2026-01-02 15:36:35.955
cmjyaeon2000hi83afhf1gdqe	cmjx1izq70003i3dsywr57bcz	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to PENDING_REVIEW with file update: a	f	\N	2026-01-03 12:36:45.758	2026-01-03 12:36:45.758
cmjyafzip000ri83aa9o2281j	cmjx1izq70003i3dsywr57bcz	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to PENDING_APPROVAL with file update: Baik akan kami periksa terlebih dahulu	f	\N	2026-01-03 12:37:46.514	2026-01-03 12:37:46.514
cmjzswwe2000nyrs1jccycc26	seed-doc-7	\N	cmjwvd13i0015k67y5qg7w2qq	Status changed to PENDING_REVIEW with file update: lanjut ke tahapan review bersama	f	\N	2026-01-04 14:02:34.874	2026-01-04 14:02:34.874
cmjyg0pbr000lkfi5iw8q57yc	cmjx1izq70003i3dsywr57bcz	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to APPROVED with file update: ok published	f	\N	2026-01-03 15:13:51.16	2026-01-03 15:13:51.16
cmjztdzgh000xyrs1dbfl92ge	seed-doc-7	\N	cmjwvd13i0015k67y5qg7w2qq	Status changed to DRAFT with file update: masih ada revisi dan ini setelah revisi	f	\N	2026-01-04 14:15:52.001	2026-01-04 14:15:52.001
cmjyg0z50000rkfi5i31xv8hk	cmjx1izq70003i3dsywr57bcz	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to PUBLISHED: oke	f	\N	2026-01-03 15:14:03.876	2026-01-03 15:14:03.876
cmjx1e3qq004q9kwj5sme3or7	seed-doc-1	\N	cmjwvd13i0015k67y5qg7w2qq	Flowchart di halaman 15 sangat membantu memahami alur proses.	f	\N	2024-01-17 09:30:00	2026-01-02 15:36:35.955
cmjzv51y7000lbr21seex8w3u	seed-doc-7	\N	cmjwvd13i0015k67y5qg7w2qq	Status changed to IN_REVIEW with file update: kita review lagi	f	\N	2026-01-04 15:04:54.56	2026-01-04 15:04:54.56
cmjzwhsol000bwo7ofv6kyhqj	seed-doc-3	\N	cmjwvd13i0015k67y5qg7w2qq	Status changed to IN_REVIEW with file update: ok lanjut erview	f	\N	2026-01-04 15:42:48.693	2026-01-04 15:42:48.693
cmk0im6jq000betf4tvl751g4	seed-doc-7	\N	cmjwvd13i0015k67y5qg7w2qq	Status changed to DRAFT with file update: cek lagi	f	\N	2026-01-05 02:02:04.839	2026-01-05 02:02:04.839
cmk8ks69d0007ak4kt5s5a83x	cmk48uasq0001aknpg4y98xmw	\N	cmjwvd13i0015k67y5qg7w2qq	Status changed to IN_REVIEW: masuk ke review	f	\N	2026-01-10 17:24:53.042	2026-01-10 17:24:53.042
cmk8kz2p3000iak4kpdea0pm2	cmk48uasq0001aknpg4y98xmw	\N	cmjwvd13i0011k67yhnsrcfug	Status changed to PENDING_APPROVAL: masuk ke pending approval	f	\N	2026-01-10 17:30:15.015	2026-01-10 17:30:15.015
cmk8l070v000vak4kvwndkkvu	cmk48uasq0001aknpg4y98xmw	\N	cmjwvd13i000zk67y38y267mg	Status changed to APPROVED with file update: approved	f	\N	2026-01-10 17:31:07.279	2026-01-10 17:31:07.279
cmkm7lpwg000bakwo6bx984fg	cmjx1izq70003i3dsywr57bcz	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to IN_REVIEW: Kita akan melakukan revisi untuk dokumen ini	f	\N	2026-01-20 06:24:43.36	2026-01-20 06:24:43.36
cmkm7nk8m000lakwoj7wqb07j	cmjx1izq70003i3dsywr57bcz	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to PENDING_APPROVAL with file update: Lanjut sekarang ke pending approval	f	\N	2026-01-20 06:26:09.334	2026-01-20 06:26:09.334
cmkm7ob9t000vakwojjpmccaz	cmjx1izq70003i3dsywr57bcz	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to APPROVED with file update: Oke lanjut	f	\N	2026-01-20 06:26:44.369	2026-01-20 06:26:44.369
cmkm7oh3z0011akwol0jw80ym	seed-doc-10	\N	cmjwvczk6000tk67yqfzvu89w	Status changed to APPROVED: oke	f	\N	2026-01-20 06:26:51.935	2026-01-20 06:26:51.935
\.


--
-- Data for Name: divisi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.divisi (id, name, code, description, is_active, created_at, parent_id, head_id) FROM stdin;
cmjwvczbk000ok67yshww86ov	Finance	FIN	Divisi Keuangan	t	2026-01-02 12:47:45.873	\N	\N
cmjwvczbk000rk67yw1g4yrl9	Quality Assurance	QA	Divisi Quality Assurance	t	2026-01-02 12:47:45.873	\N	\N
cmjwvczbk000nk67yxs80w76o	Information Technology	IT	Divisi Teknologi Informasi	t	2026-01-02 12:47:45.873	\N	\N
cmjwvczbk000pk67y6oi5p0qc	Operations	OPS	Divisi Operasional	t	2026-01-02 12:47:45.873	\N	\N
cmjwvczbk000qk67yq9pu8lhz	Human Resources	HR	Divisi Sumber Daya Manusia	t	2026-01-02 12:47:45.873	\N	\N
\.


--
-- Data for Name: document_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_activities (id, document_id, user_id, action, description, ip_address, user_agent, metadata, created_at) FROM stdin;
cmjx1e3qj004e9kwju3usibmd	seed-doc-9	cmjwvd13i000yk67ysjtjp81d	DOWNLOAD	Downloaded checklist for shift handover	10.0.3.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64)	\N	2024-02-05 15:45:00
cmjx1e3qj004g9kwjgof4ogj2	seed-doc-9	cmjwvd13i000yk67ysjtjp81d	VIEW	Daily operations check	10.0.3.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64)	{"checkType": "daily_routine"}	2024-02-05 07:30:00
cmjx1e3qj004i9kwjmjn2wyjr	seed-doc-4	cmjwvd13i0017k67yccjxnpiz	DOWNLOAD	Downloaded document	10.0.2.34	Mozilla/5.0 (Windows NT 10.0; Win64; x64)	\N	2024-01-09 09:30:00
cmjx1e3qj004h9kwj88bczmv9	seed-doc-5	cmjwvd13i0011k67yhnsrcfug	VIEW	Viewed organizational structure	10.0.1.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64)	\N	2024-01-10 13:00:00
cmjx1e3qj00449kwjmqjo6mjq	seed-doc-2	cmjwvd13i0017k67yccjxnpiz	DOWNLOAD	Downloaded document	10.0.1.89	Mozilla/5.0 (X11; Linux x86_64)	\N	2024-02-02 08:32:00
cmjx1e3qj00439kwj9aejb8au	seed-doc-1	cmjwvd13i0011k67yhnsrcfug	VIEW	Viewed document	10.0.1.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64)	\N	2024-01-16 09:15:00
cmjx1e3qj00429kwj3xmic5tm	seed-doc-1	cmjwvd13i0017k67yccjxnpiz	VIEW	Viewed document	10.0.1.89	Mozilla/5.0 (X11; Linux x86_64)	\N	2024-01-17 14:20:00
cmjx1e3qj00489kwjzd51a1wx	seed-doc-4	cmjwvd13i0010k67y71yvz49n	VIEW	Viewed document	10.0.2.12	Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)	\N	2024-01-08 11:00:00
cmjx1e3qj004f9kwjow6t9rho	seed-doc-10	cmjwvd13i0011k67yhnsrcfug	VIEW	Reviewing AI proposal	10.0.1.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64)	{"reviewRole": "technical_review"}	2024-03-02 09:00:00
cmjx1e3qj004a9kwjq7zg0qa7	seed-doc-3	cmjwvd13i0011k67yhnsrcfug	VIEW	Reviewing document	10.0.1.45	Mozilla/5.0 (Windows NT 10.0; Win64; x64)	{"reviewStatus": "in_progress"}	2024-02-16 10:00:00
cmjx1e3qj004m9kwjqwtpp8zg	seed-doc-1	cmjwvd13i0015k67y5qg7w2qq	DOWNLOAD	Downloaded document	10.0.1.67	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)	\N	2024-01-16 10:30:00
cmjx1e3qj004k9kwjfxlr1ghd	seed-doc-2	cmjwvd13i0017k67yccjxnpiz	VIEW	Viewed document	10.0.1.89	Mozilla/5.0 (X11; Linux x86_64)	\N	2024-02-02 08:30:00
cmjx1izqt0005i3dsiuuen6sp	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "06 PROS-91-PROSEDUR PIR2" was created with file upload	\N	\N	\N	2026-01-02 15:40:24.054
cmjyaeomt000di83ani1hzyid	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "06 PROS-91-PROSEDUR PIR2" status changed from DRAFT to PENDING_REVIEW. a	\N	\N	{"statusChange": {"to": "PENDING_REVIEW", "from": "DRAFT", "comment": "a", "timestamp": "2026-01-03T12:36:45.749Z"}}	2026-01-03 12:36:45.75
cmjyafzil000ni83a0qvsbzt5	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "06 PROS-91-PROSEDUR PIR2" status changed from PENDING_REVIEW to PENDING_APPROVAL. Baik akan kami periksa terlebih dahulu	\N	\N	{"statusChange": {"to": "PENDING_APPROVAL", "from": "PENDING_REVIEW", "comment": "Baik akan kami periksa terlebih dahulu", "timestamp": "2026-01-03T12:37:46.509Z"}}	2026-01-03 12:37:46.509
cmjyah9ud000ti83angcfd46f	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "PROSEDUR Post Implementation Review" was updated: title from "06 PROS-91-PROSEDUR PIR2" to "PROSEDUR Post Implementation Review"	\N	\N	\N	2026-01-03 12:38:46.549
cmjyahs8c000vi83agtymzkqd	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Prosedur Post Implementation Review" was updated: title from "PROSEDUR Post Implementation Review" to "Prosedur Post Implementation Review"	\N	\N	\N	2026-01-03 12:39:10.381
cmjyft03j0003kfi57l7w3u6w	seed-doc-9	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Standard Operating Procedure: Daily Operations Checklist" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:07:51.871Z"}	2026-01-03 15:07:51.872
cmjyft7y50005kfi56tpfljhg	seed-doc-6	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Sertifikat ISO 9001:2015" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:08:02.043Z"}	2026-01-03 15:08:02.044
cmjyfy5i80007kfi5qadkxsgo	seed-doc-1	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Panduan Sistem Manajemen Mutu ISO 9001:2015" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:11:52.159Z"}	2026-01-03 15:11:52.159
cmjyfyasy0009kfi512cy2u38	seed-doc-5	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Struktur Organisasi dan Tata Kelola Perusahaan 2024" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:11:59.026Z"}	2026-01-03 15:11:59.027
cmjyg07aa000bkfi5plmysdus	seed-doc-9	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Standard Operating Procedure: Daily Operations Checklist" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:13:27.777Z"}	2026-01-03 15:13:27.778
cmjyg0pbk000hkfi5ohj6wdgc	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Prosedur Post Implementation Review" status changed from PENDING_APPROVAL to APPROVED. ok published	\N	\N	{"statusChange": {"to": "APPROVED", "from": "PENDING_APPROVAL", "comment": "ok published", "timestamp": "2026-01-03T15:13:51.152Z"}}	2026-01-03 15:13:51.152
cmjyg0z4v000nkfi5s4ayhnkk	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Prosedur Post Implementation Review" status changed from APPROVED to PUBLISHED. oke	\N	\N	{"statusChange": {"to": "PUBLISHED", "from": "APPROVED", "comment": "oke", "timestamp": "2026-01-03T15:14:03.870Z"}}	2026-01-03 15:14:03.871
cmjyg158l000tkfi5qf14bpl8	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:14:11.781Z"}	2026-01-03 15:14:11.781
cmjyg1pva000vkfi504mhpyc8	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	DOWNLOAD	Document "Prosedur Post Implementation Review" was downloaded	\N	\N	{"source": "document_download", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "fileSize": "8719697", "timestamp": "2026-01-03T15:14:38.518Z"}	2026-01-03 15:14:38.518
cmjyg8nlf000xkfi5wqvt84j6	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:20:02.162Z"}	2026-01-03 15:20:02.163
cmjyg8x95000zkfi5nq3h8hqi	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_viewer_get", "timestamp": "2026-01-03T15:20:14.680Z"}	2026-01-03 15:20:14.681
cmjyg90pv0011kfi529pid6cs	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	DOWNLOAD	Document "Prosedur Post Implementation Review" was downloaded	\N	\N	{"source": "document_download", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "fileSize": "8719697", "timestamp": "2026-01-03T15:20:19.170Z"}	2026-01-03 15:20:19.171
cmjyglcgo00017qwo9g784erz	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:29:54.264Z"}	2026-01-03 15:29:54.265
cmjyglstu00057qwo7uokakpf	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:30:15.474Z"}	2026-01-03 15:30:15.474
cmkmb5lca004yakwovs9ke0p6	cmkmb5lca004wakwonpu7uv5o	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Analisis Data" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.419
cmjygrnoo00077qwoabhe2i4c	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	DOWNLOAD	Document "Prosedur Post Implementation Review" was downloaded	\N	\N	{"source": "document_download", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "fileSize": "8719697", "timestamp": "2026-01-03T15:34:48.743Z"}	2026-01-03 15:34:48.744
cmjyguzse00097qwouj3eoqy1	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_viewer_get", "timestamp": "2026-01-03T15:37:24.397Z"}	2026-01-03 15:37:24.398
cmjygwj4a000b7qwomte63o5m	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_viewer_get", "timestamp": "2026-01-03T15:38:36.099Z"}	2026-01-03 15:38:36.102
cmjygxnyl000f7qwoshv091ft	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	DOWNLOAD	Document "Prosedur Post Implementation Review" was downloaded	\N	\N	{"source": "document_download", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "fileSize": "8719697", "timestamp": "2026-01-03T15:39:29.036Z"}	2026-01-03 15:39:29.037
cmjyh3mk9000n7qwo8gq32777	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T15:44:07.160Z"}	2026-01-03 15:44:07.161
cmjyheext000p7qwojzp9viic	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_viewer_get", "timestamp": "2026-01-03T15:52:30.497Z"}	2026-01-03 15:52:30.497
cmjyhpfmb00055przzz73kpf2	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T16:01:04.595Z"}	2026-01-03 16:01:04.595
cmjyhv48o000d5przoaofouv3	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T16:05:29.780Z"}	2026-01-03 16:05:29.781
cmjyhy41w000h5prz63y704sj	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T16:07:49.506Z"}	2026-01-03 16:07:49.507
cmjyjixib000b483ab9nc876b	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0015k67y5qg7w2qq	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-03T16:52:00.418Z"}	2026-01-03 16:52:00.419
cmjzs3rtl0007yrs14hewrm67	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T13:39:55.929Z"}	2026-01-04 13:39:55.929
cmjzs53hd0009yrs1chk79tf2	seed-doc-9	cmjwvd13i0015k67y5qg7w2qq	VIEW	Document "Standard Operating Procedure: Daily Operations Checklist" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T13:40:57.697Z"}	2026-01-04 13:40:57.698
cmjzswwdw000jyrs16oul6qcd	seed-doc-7	cmjwvd13i0015k67y5qg7w2qq	UPDATE	Document "Kebijakan Kerja Remote dan Hybrid Working" status changed from DRAFT to PENDING_REVIEW. lanjut ke tahapan review bersama	\N	\N	{"statusChange": {"to": "PENDING_REVIEW", "from": "DRAFT", "comment": "lanjut ke tahapan review bersama", "timestamp": "2026-01-04T14:02:34.867Z"}}	2026-01-04 14:02:34.868
cmjztdzg9000tyrs1o8eg2y72	seed-doc-7	cmjwvd13i0015k67y5qg7w2qq	UPDATE	Document "Kebijakan Kerja Remote dan Hybrid Working" status changed from PENDING_REVIEW to DRAFT. masih ada revisi dan ini setelah revisi	\N	\N	{"statusChange": {"to": "DRAFT", "from": "PENDING_REVIEW", "comment": "masih ada revisi dan ini setelah revisi", "timestamp": "2026-01-04T14:15:51.993Z"}}	2026-01-04 14:15:51.993
cmjzv51xz000hbr21dyzijdur	seed-doc-7	cmjwvd13i0015k67y5qg7w2qq	UPDATE	Document "Kebijakan Kerja Remote dan Hybrid Working" status changed from DRAFT to IN_REVIEW. kita review lagi	\N	\N	{"statusChange": {"to": "IN_REVIEW", "from": "DRAFT", "comment": "kita review lagi", "timestamp": "2026-01-04T15:04:54.551Z"}}	2026-01-04 15:04:54.551
cmjzw47il00034pc59uc9kg1k	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0015k67y5qg7w2qq	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T15:32:14.733Z"}	2026-01-04 15:32:14.733
cmjzwhsof0007wo7o8jzzj44y	seed-doc-3	cmjwvd13i0015k67y5qg7w2qq	UPDATE	Document "Instruksi Kerja Khusus: Pengujian Software Pre-Production" status changed from DRAFT to IN_REVIEW. ok lanjut erview	\N	\N	{"statusChange": {"to": "IN_REVIEW", "from": "DRAFT", "comment": "ok lanjut erview", "timestamp": "2026-01-04T15:42:48.687Z"}}	2026-01-04 15:42:48.688
cmjzwwwaq0003wnclefwmbfrp	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0015k67y5qg7w2qq	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T15:54:33.217Z"}	2026-01-04 15:54:33.217
cmjzx42t0000bwnclc486wokx	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	DOWNLOAD	Document "Prosedur Post Implementation Review" was downloaded	\N	\N	{"source": "document_download", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "fileSize": "8719697", "timestamp": "2026-01-04T16:00:08.243Z"}	2026-01-04 16:00:08.244
cmjzx4z4d000dwnclwecbtmrb	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T16:00:50.125Z"}	2026-01-04 16:00:50.126
cmjzx7dft000fwncl7mf6kbzp	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0015k67y5qg7w2qq	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T16:02:41.990Z"}	2026-01-04 16:02:41.992
cmjzxk5ey00036d7024f2bex0	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T16:12:38.120Z"}	2026-01-04 16:12:38.121
cmjzxw2n900019lyc87u4v4ni	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0015k67y5qg7w2qq	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-04T16:21:54.404Z"}	2026-01-04 16:21:54.404
cmk0h0b5w0003j4k5b029m3jl	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-05T01:17:04.771Z"}	2026-01-05 01:17:04.772
cmk0iij2v0001etf4yzznnld7	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-05T01:59:14.454Z"}	2026-01-05 01:59:14.455
cmk0im6jo0007etf4niaodsbb	seed-doc-7	cmjwvd13i0015k67y5qg7w2qq	UPDATE	Document "Kebijakan Kerja Remote dan Hybrid Working" status changed from IN_REVIEW to DRAFT. cek lagi	\N	\N	{"statusChange": {"to": "DRAFT", "from": "IN_REVIEW", "comment": "cek lagi", "timestamp": "2026-01-05T02:02:04.836Z"}}	2026-01-05 02:02:04.836
cmk0iulnb000petf4gqt9sphd	cmk0iulms000netf46d0s4ofw	cmjwvd13i0017k67yccjxnpiz	CREATE	Document "01e95c20-830e-41db-8fca-ad1cdd4a8e50" was created with file upload	\N	\N	\N	2026-01-05 02:08:37.656
cmk0iwzz9000retf4tuaevumu	cmk0iulms000netf46d0s4ofw	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Manajemen Data" was updated: title from "01e95c20-830e-41db-8fca-ad1cdd4a8e50" to "Manajemen Data"	\N	\N	\N	2026-01-05 02:10:29.542
cmk0no3gj000nn4umk5xzu49i	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0017k67yccjxnpiz	DOWNLOAD	Document "Prosedur Post Implementation Review" was downloaded	\N	\N	{"source": "document_download", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "fileSize": "8719697", "timestamp": "2026-01-05T04:23:32.225Z"}	2026-01-05 04:23:32.226
cmk28vxvo0024ak4nr6e1c3tw	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-06T07:05:16.354Z"}	2026-01-06 07:05:16.355
cmk3cjp9y002aak4nmw7igmft	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-07T01:35:29.973Z"}	2026-01-07 01:35:29.974
cmk3hcvt10021ak71a8a4p00w	cmjx1izq70003i3dsywr57bcz	cmk3h9wjo001nak71q3mgd3bb	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-07T03:50:09.924Z"}	2026-01-07 03:50:09.925
cmk3hlccs002nak718v9kluh0	cmjx1izq70003i3dsywr57bcz	cmk3h9wjo001nak71q3mgd3bb	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-07T03:56:44.620Z"}	2026-01-07 03:56:44.621
cmk3hvv210031ak7157hoopc2	cmjx1izq70003i3dsywr57bcz	cmk3h9wjo001nak71q3mgd3bb	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-07T04:04:55.416Z"}	2026-01-07 04:04:55.416
cmk3ie08p0044ak715rhgeouk	cmjx1izq70003i3dsywr57bcz	cmjwvd13i0016k67yomlhj23c	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-07T04:19:01.944Z"}	2026-01-07 04:19:01.945
cmk3iwnpu0009ak5q8cimcuss	seed-doc-8	cmjwvczk6000tk67yqfzvu89w	DELETE	Document "Prosedur Pengelolaan Dokumen Manual (Superseded)" was archived/deleted	\N	\N	\N	2026-01-07 04:33:32.178
cmk3ix0x2000bak5q6wdwkhn7	seed-doc-8	cmjwvczk6000tk67yqfzvu89w	DELETE	Document "Prosedur Pengelolaan Dokumen Manual (Superseded)" was archived/deleted	\N	\N	\N	2026-01-07 04:33:49.287
cmk48uatl0003aknpb77hwoaj	cmk48uasq0001aknpg4y98xmw	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Instruksi Kerja Prosedur 91 Post Implementation Review" was created with file upload	\N	\N	\N	2026-01-07 16:39:32.17
cmk49gtwl0007aknp9vign9aq	cmk48uasq0001aknpg4y98xmw	cmjwvczk6000tk67yqfzvu89w	UPDATE	Moved document to new parent	\N	\N	{"action": "move", "reason": "Moved via UI", "newParentId": "seed-doc-10", "oldParentId": "cmjx1izq70003i3dsywr57bcz"}	2026-01-07 16:57:03.333
cmk49r2mr0001akxc4qlr5rs6	cmk48uasq0001aknpg4y98xmw	cmjwvczk6000tk67yqfzvu89w	UPDATE	Moved document to new parent	\N	\N	{"action": "move", "reason": "Moved via UI", "newParentId": "seed-doc-7", "oldParentId": "seed-doc-10"}	2026-01-07 17:05:01.203
cmk4raopd0001ak0td9k4oja5	cmk48uasq0001aknpg4y98xmw	cmjwvczk6000tk67yqfzvu89w	UPDATE	Moved document to new parent	\N	\N	{"action": "move", "reason": "Moved via UI", "newParentId": "seed-doc-7", "oldParentId": "seed-doc-7"}	2026-01-08 01:16:09.745
cmk4rbuwx0003ak0thasjc4jt	test-live-2026-01-03-10-20-19	cmjwvczk6000tk67yqfzvu89w	UPDATE	Moved document to new parent	\N	\N	{"action": "move", "reason": "Moved via UI", "newParentId": "seed-doc-7", "oldParentId": "cmk0iulms000netf46d0s4ofw"}	2026-01-08 01:17:04.449
cmk4rg3rj0005ak0thsj8zxgp	cmk48uasq0001aknpg4y98xmw	cmjwvczk6000tk67yqfzvu89w	UPDATE	Moved document to new parent	\N	\N	{"action": "move", "reason": "Moved via UI", "newParentId": "cmjx1izq70003i3dsywr57bcz", "oldParentId": "seed-doc-7"}	2026-01-08 01:20:22.543
cmk4rhad10007ak0tj8b8his6	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-08T01:21:17.749Z"}	2026-01-08 01:21:17.75
cmk8ks6900003ak4kguetefs2	cmk48uasq0001aknpg4y98xmw	cmjwvd13i0015k67y5qg7w2qq	UPDATE	Document "Instruksi Kerja Prosedur 91 Post Implementation Review" status changed from DRAFT to IN_REVIEW. masuk ke review	\N	\N	{"statusChange": {"to": "IN_REVIEW", "from": "DRAFT", "comment": "masuk ke review", "timestamp": "2026-01-10T17:24:53.028Z"}}	2026-01-10 17:24:53.028
cmk8kz2ow000eak4kdq4gtkit	cmk48uasq0001aknpg4y98xmw	cmjwvd13i0011k67yhnsrcfug	UPDATE	Document "Instruksi Kerja Prosedur 91 Post Implementation Review" status changed from IN_REVIEW to PENDING_APPROVAL. masuk ke pending approval	\N	\N	{"statusChange": {"to": "PENDING_APPROVAL", "from": "IN_REVIEW", "comment": "masuk ke pending approval", "timestamp": "2026-01-10T17:30:15.007Z"}}	2026-01-10 17:30:15.008
cmk8l070q000rak4k0fe9hj25	cmk48uasq0001aknpg4y98xmw	cmjwvd13i000zk67y38y267mg	UPDATE	Document "Instruksi Kerja Prosedur 91 Post Implementation Review" status changed from PENDING_APPROVAL to APPROVED. approved	\N	\N	{"statusChange": {"to": "APPROVED", "from": "PENDING_APPROVAL", "comment": "approved", "timestamp": "2026-01-10T17:31:07.274Z"}}	2026-01-10 17:31:07.275
cmk8l8cyy000yak4ke2lk4byk	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-10T17:37:28.233Z"}	2026-01-10 17:37:28.234
cmkaqj9wd0003akkacz04g3bk	cmkaqj9vt0001akka05undnqg	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "modul01" was created with file upload	\N	\N	\N	2026-01-12 05:41:27.901
cmkaqk6c10005akkayaoqytpm	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-12T05:42:09.936Z"}	2026-01-12 05:42:09.937
cmkm32anv0001akwoibplx392	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Prosedur Post Implementation Review" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-20T04:17:38.682Z"}	2026-01-20 04:17:38.683
cmkm32ycr0003akwoua49r9oj	seed-doc-9	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Standard Operating Procedure: Daily Operations Checklist" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-20T04:18:09.387Z"}	2026-01-20 04:18:09.388
cmkm7lpw60007akwobmyush2j	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Prosedur Post Implementation Review" status changed from PUBLISHED to IN_REVIEW. Kita akan melakukan revisi untuk dokumen ini	\N	\N	{"statusChange": {"to": "IN_REVIEW", "from": "PUBLISHED", "comment": "Kita akan melakukan revisi untuk dokumen ini", "timestamp": "2026-01-20T06:24:43.350Z"}}	2026-01-20 06:24:43.351
cmkm7nk8i000hakwomwig61ne	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Prosedur Post Implementation Review" status changed from IN_REVIEW to PENDING_APPROVAL. Lanjut sekarang ke pending approval	\N	\N	{"statusChange": {"to": "PENDING_APPROVAL", "from": "IN_REVIEW", "comment": "Lanjut sekarang ke pending approval", "timestamp": "2026-01-20T06:26:09.330Z"}}	2026-01-20 06:26:09.33
cmkmb5lce0052akwo6cosda4o	cmkmb5lcc0050akwo3hz0t2p8	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Bajir" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.422
cmkm7ob9o000rakwok7ud5vay	cmjx1izq70003i3dsywr57bcz	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Prosedur Post Implementation Review" status changed from PENDING_APPROVAL to APPROVED. Oke lanjut	\N	\N	{"statusChange": {"to": "APPROVED", "from": "PENDING_APPROVAL", "comment": "Oke lanjut", "timestamp": "2026-01-20T06:26:44.364Z"}}	2026-01-20 06:26:44.364
cmkm7oh3q000xakwo20v71wrk	seed-doc-10	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Proposal Implementasi AI untuk Document Classification" status changed from PENDING_APPROVAL to APPROVED. oke	\N	\N	{"statusChange": {"to": "APPROVED", "from": "PENDING_APPROVAL", "comment": "oke", "timestamp": "2026-01-20T06:26:51.925Z"}}	2026-01-20 06:26:51.926
cmkmb5l9h001eakwomw9k86or	cmkmb5l8z001cakwo5vfhup1t	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyusunan dan Penomoran Naskah Dinas" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.316
cmkmb5l9n001iakwozi20lcqj	cmkmb5l9l001gakwo7jikem1n	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Dokumen" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.323
cmkmb5l9q001makwoa6spl6w6	cmkmb5l9p001kakwo1gsenw1u	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Dokumen Bukti Kerja" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.327
cmkmb5l9v001qakwob6fopqru	cmkmb5l9s001oakwof6xvi43i	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Rapat Tinjauan Manajemen" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.332
cmkmb5l9y001uakwob249b1yl	cmkmb5l9x001sakwoi1bis2xc	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Audit Internal Sistem Manajemen" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.335
cmkmb5la2001yakwo8eni3yn2	cmkmb5la0001wakwosxiinhq2	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyusunan Rencana Kerja Dan Anggaran Perusahaan Perum Jasa Tirta II" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.338
cmkmb5la70022akwoyyks7dg0	cmkmb5la50020akwoeiks3juh	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemantauan Dan Evaluasi Pelaksanaan Rencana Kerja" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.343
cmkmb5laa0026akwo6h75vi49	cmkmb5la90024akwooqy0b3sr	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Rekruitmen Karyawan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.347
cmkmb5lad002aakwof3ylxu68	cmkmb5lac0028akwock9bws46	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pendidikan Dan Pelatihan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.35
cmkmb5lah002eakwo4eb5q0q3	cmkmb5lag002cakwol5nczq42	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Keuangan Perusahaan Umum (Perum) Jasa Tirta II" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.353
cmkmb5lak002iakwo37ya0wjv	cmkmb5lai002gakwoxgpyw3d1	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemeliharaan Prasarana Sumber Day Air dan Listrik" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.356
cmkmb5lan002makwoanhrqhvj	cmkmb5lal002kakwoknkwu9r9	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Supervisi Teknik" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.359
cmkmb5lap002qakwo6g2f0mmt	cmkmb5lao002oakwo69vve3gw	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Perencanaan Realisasi Produk" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.362
cmkmb5las002uakwouyzyep47	cmkmb5lar002sakwo84dwmin3	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Operasi Jaringan Pengairan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.364
cmkmb5lau002yakwo0csdh3ns	cmkmb5lat002wakwor26cmvpv	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Administrasi Barang Pergudangan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.366
cmkmb5law0032akwooqp4y0au	cmkmb5lav0030akwoaq3vb20w	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Operasi Bendung" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.369
cmkmb5laz0036akwo55eg7tjh	cmkmb5lay0034akwoduunzudj	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyediaan Air Baku Untuk PT. Sang Hyang Seri (Persero)" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.371
cmkmb5lb1003aakwowk8iodfi	cmkmb5lb00038akwo1qsehmzf	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemantauan Dan Pengukuran Kepuasan Pemasok" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.374
cmkmb5lb7003eakwohmnmst0m	cmkmb5lb4003cakwov52jmw5l	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Rencana Mutu Operasi Penyediaan Energi Listrik Ir.H.Djuanda Dan Pembangkit Listrik Tenaga Mini Hidro (PLTMH) Curug" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.38
cmkmb5lbc003iakwoqjg5540a	cmkmb5lb9003gakwoxi9ftf1c	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengusahaan Air Baku" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.384
cmkmb5lbg003makwoek6qn6a6	cmkmb5lbe003kakwodglfr7ck	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengusahaan Penyediaan Dan Pemakaian Tenaga Listrik Non PLN Dan Perumahan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.388
cmkmb5lbk003qakwo1oztgq9g	cmkmb5lbi003oakwomkauam9j	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pelaksanaan Penelitian Dan Pengembangan (LITBANG) Di Lingkungan Perum Jasa Tirta II" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.392
cmkmb5lbn003uakwop7bzyruk	cmkmb5lbm003sakwouz15443o	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Perencanaan Teknik" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.396
cmkmb5lbq003yakwowds7hac7	cmkmb5lbp003wakwo6obkxey8	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pelaksanaan Kalibrasi" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.399
cmkmb5lbt0042akwotg3oji0z	cmkmb5lbs0040akwo94jye0dq	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Survey Kepuasan Pelanggan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.401
cmkmb5lbv0046akwop47jvqoj	cmkmb5lbu0044akwofltq4n14	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengeringan Jaringan Irigasi" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.404
cmkmb5lbx004aakwopxje7q8j	cmkmb5lbx0048akwog2jyt2bg	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemantauan Dan Pelaporan Keselamatan Bendungan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.406
cmkmb5lc0004eakwotbfaawvp	cmkmb5lbz004cakwo1kwyyz01	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Inspeksi Saluran Bawah (TAILRACE) Bendungan IR.H.Juanda" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.408
cmkmb5lc2004iakwo0llf475z	cmkmb5lc1004gakwodc1n3w6k	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemantauan Kualitas Air Sungai / Saluran / Waduk" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.41
cmkmb5lc4004makwoz9cdhdvp	cmkmb5lc3004kakwod9rwjc55	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Evaluasi Hasil Analisis Buangan Limbah Cair Indsustri" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.412
cmkmb5lc6004qakwo8hx26c3k	cmkmb5lc5004oakwouiyierv5	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Dan Penanganan Ketidaksesuaian" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.415
cmkmb5lc8004uakwobjkpa1nd	cmkmb5lc7004sakwolvxqp920	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penanganan Darurat Bencana" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.417
cmkmb5lch0056akwo21q6qvs6	cmkmb5lcg0054akwoa507tiq0	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Rencana Mutu Operasi Penyediaan Air Baku Untuk Industri, PDAM DKI (PAM JAYA), Industri Dan PDAM Kota/Kabupaten" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.426
cmkmb5lcl005aakwo8euvqhke	cmkmb5lck0058akwolngtyn6n	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penanganan Keluhan Pelanggan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.43
cmkmb5lcp005eakwojx4derr3	cmkmb5lcn005cakwowv0sssk1	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyusunan Laporan Manajemen" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.433
cmkmb5lcr005iakwo25rekbme	cmkmb5lcq005gakwosyrgmx9r	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyusunan Perjanjian Kerja Bersama" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.436
cmkmb5lct005makwomy5o7g3r	cmkmb5lcs005kakwof6q4cphi	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Inspeksi Keselamatan Dan Kesehatan Kerja" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.438
cmkmb5lcv005qakwo1m4dnl8u	cmkmb5lcv005oakwoqq1lm718	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Kepatuhan Peraturan Perundang-undangan Keselamatan Kerja" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.44
cmkmb5lcy005uakwoy90fv190	cmkmb5lcx005sakwo5bn6moa9	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Identifikasi Potensi Bahaya Dan Pengendalian Risiko" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.442
cmkmb5ld0005yakwoqenqs8u6	cmkmb5lcz005wakwo1wg9so7r	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Permohonan Informasi" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.445
cmkmb5ld20062akwozeu76qna	cmkmb5ld10060akwoxfo47wzo	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Alat Pelindung Diri" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.447
cmkmb5ld50066akwo27nr3me5	cmkmb5ld40064akwoqscgmc1b	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Komunikasi K3" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.45
cmkmb5ld8006aakwofs4emjth	cmkmb5ld60068akwokxhlad94	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Ijin Kerja K3" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.452
cmkmb5lda006eakwoiwcahiti	cmkmb5ld9006cakwo5up1sqqn	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengelolaan Pernyataan Keberatan & Penanganan Sengketa Informasi Publik" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.454
cmkmb5ldc006iakwoo1y4356b	cmkmb5ldb006gakwobs254dsz	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyelesaian Piutang Perusahaan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.457
cmkmb5ldf006makwooj1cx2q5	cmkmb5lde006kakwofnprtyrg	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penetapan dan Pemuktakhiran serta Pendokumentasian Daftar Informasi Publik" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.459
cmkmb5ldh006qakwoppn9maby	cmkmb5ldg006oakwowlnjde8g	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemeliharaan Bangunan Gedung" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.462
cmkmb5ldk006uakwo4cp3aigl	cmkmb5ldi006sakwow6v1tudm	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengujian tentang Konseskuen dan Pendokumentasian Informasi yang dikecualikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.464
cmkmb5ldm006yakwolvhgpw6e	cmkmb5ldl006wakwopfpbv2jg	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemeliharaan Kesehatan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.467
cmkmb5ldp0072akwo7njuf5wa	cmkmb5ldo0070akwojznr3l8a	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur DPT DPTS" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.469
cmkmb5ldr0076akwogj6db1b0	cmkmb5ldq0074akwor4fitktx	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Operasi Hollow Cone Valve" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.471
cmkmb5le4007aakwoz6tx3ac0	cmkmb5lds0078akwosmz1tis4	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur PROSEDUR MANAJEMEN RISIKO PERUSAHAAN" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.484
cmkmb5lei007eakwok56yqjei	cmkmb5le8007cakwo8iks5qdm	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Audit Sistem Manajemen Anti Penyuapan (SMAP)" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.499
cmkmb5lep007iakwoma5nwj1p	cmkmb5lem007gakwob4xa5eum	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Fungsi Kepatuhan Anti Penyuapan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.505
cmkmb5les007makwo5akmv3qd	cmkmb5ler007kakwolfttlqmp	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemantauan Pengukuran dan Analisi" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.508
cmkmb5leu007qakwo9ekw9gxy	cmkmb5let007oakwoxywsdqaq	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyaluran PKBL" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.511
cmkmb5lex007uakwojpqtny8c	cmkmb5lew007sakwof8rqn02i	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Tindakan Korektif dan Peningkatan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.513
cmkmb5lez007yakwoo85cetl5	cmkmb5ley007wakwopyr25i8q	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Uji Kelayakan atau Due Diligence" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.516
cmkmb5lf20082akwoqmktwgsa	cmkmb5lf10080akwos0rrmmyk	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Dokumen SMAP" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.518
cmkmb5lf40086akwojibicxzi	cmkmb5lf30084akwo1i83nzay	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pelepasan Barang Bekas Non Inventaris" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.521
cmkmb5lf7008aakwo9n1v2w2g	cmkmb5lf60088akwoofb7wywj	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengelolaan Water Meter" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.524
cmkmb5lfa008eakwodr0hg9zx	cmkmb5lf9008cakwonanryd15	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penghapusbukuan Aset Milik" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.526
cmkmb5lfc008iakwomsf6nbzb	cmkmb5lfb008gakwoacqjgsfs	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyusunan Rencana Kerja Bulanan /Triwulanan (RKB/RKT)" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.529
cmkmb5lff008makwovq2t4aky	cmkmb5lfe008kakwo1otl3ccx	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Pinjaman Modal Kerja Anak Perusahaan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.532
cmkmb5lfj008qakwouxpevn3o	cmkmb5lfh008oakwojkaktj35	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengelolaan Konten Website Jasa Tirta II" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.535
cmkmb5lfl008uakwovhlecodf	cmkmb5lfk008sakwo9elf0ik0	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengelolaan Arsip" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.538
cmkmb5lfp008yakwobft4dl3f	cmkmb5lfn008wakwo6zf5i4jj	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penyusunan Cascading KPI dan Pemantauan Capaian KPI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.541
cmkmb5lfr0092akwosgtblxnd	cmkmb5lfq0090akwoxkd07trc	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Tinjauan Kontrak" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.544
cmkmb5lfu0096akwol18tlcgo	cmkmb5lft0094akwoxvdlhedq	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Perancangan K3" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.546
cmkmb5lfw009aakwot9m7yuv3	cmkmb5lfv0098akwoftb8sxp0	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penanganan Bahan dan Limbah B3" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.549
cmkmb5lfz009eakwojwml5w2k	cmkmb5lfy009cakwofl5wtmub	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Investigasi Kecelakaan Kerja dan Penyakit Akibat Kerja" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.551
cmkmb5lg1009iakwonado3bl5	cmkmb5lg0009gakwo4wxlhhfd	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pemantauan Lingkungan Kerja" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.554
cmkmb5lg4009makwonq8ubh9l	cmkmb5lg3009kakwo47he49oz	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Organisasi Penanggung Jawab Keselamatan Kerja" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.557
cmkmb5lg7009qakwohd70ni69	cmkmb5lg6009oakwo1f4sximt	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penunjukan Pengurus Dana Pensiun" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.559
cmkmb5lga009uakwo51mbrili	cmkmb5lg9009sakwo5mshgw31	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pelaporan dan Penanggulangan Bahaya" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.562
cmkmb5lgd009yakwo6my0ts1k	cmkmb5lgc009wakwo8bmw86g0	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Bantuan Biaya Pembinaan Ketaqwaan Kepada Tuhan Yang Maha Esa" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.565
cmkmb5lgg00a2akwotp0gjilg	cmkmb5lgf00a0akwo8g5kdtiv	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Conctractor Safety Management System (CSMS)" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.568
cmkmb5lgn00a6akwo69zw5vxs	cmkmb5lgh00a4akwok77nqjs7	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "PENGELOLAAN TRANSAKSI AIR MINUM CURAH DAN AIR BAKU SPAM REGIONAL JATILUHUR I" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.576
cmkmb5lgq00aaakwomtdzfq2g	cmkmb5lgp00a8akwo9ag4dr57	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Audit Penerapan SMK2" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.579
cmkmb5lgt00aeakwoi74cro4o	cmkmb5lgs00acakwo6eapi10r	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penanggulangan Kondisi Darurat Keselamatan Ketenagalistrikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.582
cmkmb5lgw00aiakwotof43xxe	cmkmb5lgv00agakwoad9gslek	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Informasi Keselamatan Ketenagalistrikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.584
cmkmb5lgy00amakwotcy44lqq	cmkmb5lgx00akakwojutj7ly6	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pendidikan dan Pelatihan Bidang SMK2" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.587
cmkmb5lh200aqakwof7qj77tb	cmkmb5lh100aoakwo6kp3q2g5	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengendalian Dokumen Keselamatan Ketenagalistrikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.591
cmkmb5lh500auakwoe5bseshd	cmkmb5lh400asakwoqw9nzqsx	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Administrasi Keselamatan Ketenagalistrika" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.594
cmkmb5lh800ayakwom518emv1	cmkmb5lh700awakwoypeb3suj	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Organisasi SMK2" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.597
cmkmb5lhb00b2akwo8q010gmy	cmkmb5lha00b0akwonllqx2pe	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Kepatuhan Perundang-undangan Keselamatan Ketenagalistrikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.6
cmkmb5lhe00b6akwoerk04ine	cmkmb5lhd00b4akwo53pgqes7	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Perubahan Keselamatan Ketenagalistrikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.602
cmkmb5lhh00baakwonn6gc3g6	cmkmb5lhg00b8akwor3sevkvw	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pelaporan dan Investigasi Kejadian Kecelakaan, Kejadian Berbahaya, Kegagalan operasi dan/atau Gangguan Berdampak pada masyakarat" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.606
cmkmb5lhk00beakwo4t9k588t	cmkmb5lhj00bcakwo1pcwnwze	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengelolaan dan Pemantauan Pekerjaan Pihak Ketiga Keselamatan Ketenagalistrikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.608
cmkmb5lhn00biakwohidqd8wy	cmkmb5lhm00bgakwowhlhw1n3	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur  Pengelolaan Keandalam Opersi Pembangkitan Tenaga Listrik Keselamatan Ketenagalistrikan" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.611
cmkmb5lhq00bmakwo1pnyas4n	cmkmb5lhp00bkakwojjfz5orh	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Layanan TI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.614
cmkmb5lht00bqakwo3o1esm9w	cmkmb5lhr00boakwo4ufbb690	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Perubahan TI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.618
cmkmb5lhw00buakwod4j35b2a	cmkmb5lhv00bsakwohd1ny3cc	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengembangan Aplikasi" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.621
cmkmb5lhz00byakwoj74ny7ex	cmkmb5lhy00bwakwo8fr0eo1y	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Rilis TI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.624
cmkmb5li200c2akwoz8dilkby	cmkmb5li100c0akwox96b0i4y	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Transisi Layanan Baru" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.627
cmkmb5li500c6akwof2qq874z	cmkmb5li400c4akwokro8v522	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur PIR" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.63
cmkmb5li800caakwo2seg9zhh	cmkmb5li700c8akwomovz5jip	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Infrastruktur TI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.633
cmkmb5lic00ceakwooggh6weh	cmkmb5lib00ccakwoc1bjbkq6	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Konfigurasi" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.637
cmkmb5lif00ciakwodsl5zamu	cmkmb5lie00cgakwo8aimoqgy	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Insiden TI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.64
cmkmb5lii00cmakwoc9zz5pfx	cmkmb5lih00ckakwovbac2rcq	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Hak Ases" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.643
cmkmb5lil00cqakwomt8ye19b	cmkmb5lik00coakwo3gym8yxl	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Keberlangsungan TI / IT DRP" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.646
cmkmb5lio00cuakwowtinc0aj	cmkmb5lin00csakwok7dwores	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Pros BCM" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.649
cmkmb5lir00cyakwoeo0vdi7x	cmkmb5liq00cwakwoum0g3je7	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Proyek TI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.652
cmkmb5liu00d2akwor9lhi571	cmkmb5lit00d0akwoc5m2v2uy	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Analisa Biaya dan Manfaat (CBA)" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.655
cmkmb5lix00d6akwoseam2mwl	cmkmb5liw00d4akwo4p7y59wk	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen SLA" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.658
cmkmb5lj000daakwoz97yycir	cmkmb5liz00d8akwoq30sz3xm	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Data" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.66
cmkmb5lj300deakwo7qfyf58h	cmkmb5lj200dcakwod1s8kqnh	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Manajemen Inovasi TI" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.663
cmkmb5lj600diakwor78s5hqd	cmkmb5lj500dgakwo45j0q7ml	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Rencana Pemulihan Bencana TI (IT Disaster Recovery Plan)" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.667
cmkmb5lj900dmakwou35mqx32	cmkmb5lj800dkakwomvhrkt7i	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengusahaan Laboratorim" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.67
cmkmb5ljd00dqakwoacrpt48t	cmkmb5ljb00doakwogpwg8m30	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengusahaan Listrik PT PLN" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.673
cmkmb5ljg00duakwow8uhtmiw	cmkmb5ljf00dsakwoweu3lhfq	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengurusan Tarif Biaya Jasa Pengelolaan Sumber Daya Air (BJPSDA) Ke Kementerian PUPR" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.677
cmkmb5ljk00dyakwou7md0sr8	cmkmb5lji00dwakwo8x89584s	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Perjanjian Jual Beli Tenaga Listrik PLTA Ir. H. Djuanda antara PJT II\ndengan PT. PLN (Persero)" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.68
cmkmb5ljn00e2akwojxhlr337	cmkmb5ljl00e0akwok7pnj87m	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Pengamanan Aset" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.683
cmkmb5ljq00e6akwohu7h8ub3	cmkmb5ljp00e4akwo8v1xwwuu	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Prosedur Penerimaan Kunjungan Obyek Vital Nasional" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.686
cmkmb5ljt00eaakwo1g516wsk	cmkmb5ljs00e8akwop5sl42mk	cmjwvczk6000tk67yqfzvu89w	CREATE	Document "Evaluasi atas Efektivitas Sistem Pengendalian Internal" created via CSV import (pending file upload)	\N	\N	\N	2026-01-20 08:04:09.69
cmkmbh6gm00ecakwo8ndhzf9z	cmkmb5li400c4akwokro8v522	cmjwvczk6000tk67yqfzvu89w	UPDATE	Document "Prosedur PIR" was updated	\N	\N	\N	2026-01-20 08:13:10.006
cmkmbh8c600egakwo2tet9d9k	cmkmb5li400c4akwokro8v522	cmjwvczk6000tk67yqfzvu89w	UPDATE	File updated for document "Prosedur PIR" (version 1.1)	\N	\N	\N	2026-01-20 08:13:12.438
cmkuppbae000jak0d7stoarzj	seed-doc-1	cmjwvczk6000tk67yqfzvu89w	VIEW	Document "Panduan Sistem Manajemen Mutu ISO 9001:2015" was viewed	\N	\N	{"source": "document_details_api", "timestamp": "2026-01-26T05:13:33.542Z"}	2026-01-26 05:13:33.543
\.


--
-- Data for Name: document_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_history (id, document_id, action, field_changed, old_value, new_value, status_from, status_to, changed_by_id, change_reason, metadata, created_at) FROM stdin;
cmjx1e3pb002o9kwj3q8wnqri	seed-doc-1	STATUS_CHANGE	\N	\N	\N	DRAFT	\N	cmjwvczk6000tk67yqfzvu89w	Submitted for review	\N	2024-01-11 14:00:00
cmjx1e3pd002q9kwjy9q3xn11	seed-doc-7	UPDATE	version	0.2	0.3	\N	\N	cmjwvd13i0015k67y5qg7w2qq	Added hybrid working guidelines	\N	2024-02-28 16:30:00
cmjx1e3pm002t9kwjxi379r3v	seed-doc-7	UPDATE	version	0.1	0.2	\N	\N	cmjwvd13i0015k67y5qg7w2qq	Updated policy based on stakeholder feedback	\N	2024-02-23 14:00:00
cmjx1e3pm00309kwj10bq0goh	seed-doc-2	STATUS_CHANGE	\N	\N	\N	DRAFT	\N	cmjwvd13i0017k67yccjxnpiz	Ready for technical review	\N	2024-01-25 15:00:00
cmjx1e3pm002u9kwjydmzsxjh	seed-doc-2	APPROVE	\N	\N	\N	\N	APPROVED	cmjwvd13i0011k67yhnsrcfug	Technical review passed	\N	2024-01-30 15:00:00
cmjx1e3pm002z9kwjmk1oituu	seed-doc-3	STATUS_CHANGE	\N	\N	\N	DRAFT	\N	cmjwvd13i0015k67y5qg7w2qq	Submitted for approval	{"reviewers": ["ppd@dsm.com", "kadiv@dsm.com"]}	2024-02-15 09:30:00
cmjx1e3pn00329kwjtdh4tw8e	seed-doc-1	PUBLISH	\N	\N	\N	APPROVED	PUBLISHED	cmjwvczk6000tk67yqfzvu89w	Publishing approved document	\N	2024-01-15 08:00:00
cmjx1e3pq00369kwjxt45gq99	seed-doc-1	UPDATE	description	Panduan sistem manajemen mutu	Panduan lengkap implementasi sistem manajemen mutu berdasarkan standar ISO 9001:2015	\N	\N	cmjwvd13i0011k67yhnsrcfug	Improved description clarity	\N	2024-01-12 09:30:00
cmjx1e3ps00389kwj4umefews	seed-doc-1	APPROVE	\N	\N	\N	\N	APPROVED	cmjwvczk6000tk67yqfzvu89w	Document meets all quality standards	{"approverComments": "Approved for publication"}	2024-01-14 16:00:00
cmjx1e3pv003a9kwjacx5kd2h	seed-doc-10	STATUS_CHANGE	\N	\N	\N	DRAFT	PENDING_APPROVAL	cmjwvd13i0017k67yccjxnpiz	Submitted for management approval	{"approvers": ["kadiv@dsm.com", "gm@dsm.com"]}	2024-03-01 09:00:00
cmjx1e3pz003k9kwjmemhpji9	seed-doc-8	STATUS_CHANGE	\N	\N	\N	PUBLISHED	ARCHIVED	cmjwvczk6000tk67yqfzvu89w	Document superseded by digital system	{"supersededBy": "Digital Document Management System"}	2023-12-31 23:59:59
cmjx1e3pm002x9kwjt3hqatjr	seed-doc-1	CREATE	\N	\N	\N	\N	DRAFT	cmjwvczk6000tk67yqfzvu89w	Initial document creation	{"initialVersion": "1.0"}	2024-01-10 10:00:00
cmjx1e3po00349kwjx2jbr8dg	seed-doc-7	CREATE	\N	\N	\N	\N	DRAFT	cmjwvd13i0015k67y5qg7w2qq	Initial draft of remote work policy	\N	2024-02-20 09:00:00
cmjx1e3pw003g9kwjh9hu0peo	seed-doc-2	CREATE	\N	\N	\N	\N	DRAFT	cmjwvd13i0017k67yccjxnpiz	Creating backup procedure documentation	\N	2024-01-20 09:00:00
cmjx1e3py003i9kwj2wwtc44k	seed-doc-3	UPDATE	tags	["Testing", "Software"]	["Testing", "Software", "QA", "Deployment"]	\N	\N	cmjwvd13i0017k67yccjxnpiz	Added relevant tags	\N	2024-02-12 10:00:00
cmjx1e3pw003c9kwj364owko9	seed-doc-3	CREATE	\N	\N	\N	\N	DRAFT	cmjwvd13i0015k67y5qg7w2qq	Creating testing procedure	\N	2024-02-10 13:00:00
cmjx1e3pw003e9kwjlr03vmm1	seed-doc-10	CREATE	\N	\N	\N	\N	DRAFT	cmjwvd13i0017k67yccjxnpiz	Creating AI implementation proposal	\N	2024-02-25 09:00:00
cmjx1e3q3003m9kwjq70mo2v9	seed-doc-2	PUBLISH	\N	\N	\N	APPROVED	PUBLISHED	cmjwvd13i0017k67yccjxnpiz	Publishing for IT team	\N	2024-02-01 08:00:00
cmjyabt3v0003i83ao0cwd014	cmjx1izq70003i3dsywr57bcz	file_replaced	file	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR2.pdf\\",\\"filePath\\":\\"/uploads/documents/4f6ca6c0-1e86-42a8-b6ce-9ceac8686936.pdf\\"}"	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR3 .pdf\\",\\"filePath\\":\\"uploads/documents/1767443671549-06_PROS-91-PROSEDUR_PIR3_.pdf\\"}"	\N	\N	cmjwvczk6000tk67yqfzvu89w	File updated from 06 PROS-91-PROSEDUR PIR2.pdf to 06 PROS-91-PROSEDUR PIR3 .pdf	{"newFile": {"version": "1.1", "fileName": "06 PROS-91-PROSEDUR PIR3 .pdf", "filePath": "uploads/documents/1767443671549-06_PROS-91-PROSEDUR_PIR3_.pdf"}, "oldFile": {"version": "1.0", "fileName": "06 PROS-91-PROSEDUR PIR2.pdf", "filePath": "/uploads/documents/4f6ca6c0-1e86-42a8-b6ce-9ceac8686936.pdf"}}	2026-01-03 12:34:31.579
cmjyacldp0007i83aqsrtbt0b	cmjx1izq70003i3dsywr57bcz	file_replaced	file	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR3 .pdf\\",\\"filePath\\":\\"uploads/documents/1767443671549-06_PROS-91-PROSEDUR_PIR3_.pdf\\"}"	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR3 .pdf\\",\\"filePath\\":\\"uploads/documents/1767443708113-06_PROS-91-PROSEDUR_PIR3_.pdf\\"}"	\N	\N	cmjwvczk6000tk67yqfzvu89w	File updated from 06 PROS-91-PROSEDUR PIR3 .pdf to 06 PROS-91-PROSEDUR PIR3 .pdf	{"newFile": {"version": "1.2", "fileName": "06 PROS-91-PROSEDUR PIR3 .pdf", "filePath": "uploads/documents/1767443708113-06_PROS-91-PROSEDUR_PIR3_.pdf"}, "oldFile": {"version": "1.1", "fileName": "06 PROS-91-PROSEDUR PIR3 .pdf", "filePath": "uploads/documents/1767443671549-06_PROS-91-PROSEDUR_PIR3_.pdf"}}	2026-01-03 12:35:08.221
cmjyaeo6h000bi83asn9pglw3	cmjx1izq70003i3dsywr57bcz	file_replaced	file	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR3 .pdf\\",\\"filePath\\":\\"uploads/documents/1767443708113-06_PROS-91-PROSEDUR_PIR3_.pdf\\"}"	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR3 .pdf\\",\\"filePath\\":\\"uploads/documents/1767443805108-06_PROS-91-PROSEDUR_PIR3_.pdf\\"}"	\N	\N	cmjwvczk6000tk67yqfzvu89w	File updated from 06 PROS-91-PROSEDUR PIR3 .pdf to 06 PROS-91-PROSEDUR PIR3 .pdf	{"newFile": {"version": "1.3", "fileName": "06 PROS-91-PROSEDUR PIR3 .pdf", "filePath": "uploads/documents/1767443805108-06_PROS-91-PROSEDUR_PIR3_.pdf"}, "oldFile": {"version": "1.2", "fileName": "06 PROS-91-PROSEDUR PIR3 .pdf", "filePath": "uploads/documents/1767443708113-06_PROS-91-PROSEDUR_PIR3_.pdf"}}	2026-01-03 12:36:45.161
cmjyafz2b000li83aivn3i5w1	cmjx1izq70003i3dsywr57bcz	file_replaced	file	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR3 .pdf\\",\\"filePath\\":\\"uploads/documents/1767443805108-06_PROS-91-PROSEDUR_PIR3_.pdf\\"}"	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR4.pdf\\",\\"filePath\\":\\"uploads/documents/1767443865885-06_PROS-91-PROSEDUR_PIR4.pdf\\"}"	\N	\N	cmjwvczk6000tk67yqfzvu89w	File updated from 06 PROS-91-PROSEDUR PIR3 .pdf to 06 PROS-91-PROSEDUR PIR4.pdf	{"newFile": {"version": "1.4", "fileName": "06 PROS-91-PROSEDUR PIR4.pdf", "filePath": "uploads/documents/1767443865885-06_PROS-91-PROSEDUR_PIR4.pdf"}, "oldFile": {"version": "1.3", "fileName": "06 PROS-91-PROSEDUR PIR3 .pdf", "filePath": "uploads/documents/1767443805108-06_PROS-91-PROSEDUR_PIR3_.pdf"}}	2026-01-03 12:37:45.924
cmjyg0ovd000fkfi5ewnav0o3	cmjx1izq70003i3dsywr57bcz	file_replaced	file	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR4.pdf\\",\\"filePath\\":\\"uploads/documents/1767443865885-06_PROS-91-PROSEDUR_PIR4.pdf\\"}"	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR5.pdf\\",\\"filePath\\":\\"uploads/documents/1767453230546-06_PROS-91-PROSEDUR_PIR5.pdf\\"}"	\N	\N	cmjwvczk6000tk67yqfzvu89w	File updated from 06 PROS-91-PROSEDUR PIR4.pdf to 06 PROS-91-PROSEDUR PIR5.pdf	{"newFile": {"version": "1.5", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "filePath": "uploads/documents/1767453230546-06_PROS-91-PROSEDUR_PIR5.pdf"}, "oldFile": {"version": "1.4", "fileName": "06 PROS-91-PROSEDUR PIR4.pdf", "filePath": "uploads/documents/1767443865885-06_PROS-91-PROSEDUR_PIR4.pdf"}}	2026-01-03 15:13:50.569
cmjyaeon0000fi83aztlu0di6	cmjx1izq70003i3dsywr57bcz	status_changed	status	\N	\N	DRAFT	IN_REVIEW	cmjwvczk6000tk67yqfzvu89w	a (file also updated)	{"toStatus": "PENDING_REVIEW", "timestamp": "2026-01-03T12:36:45.756Z", "fromStatus": "DRAFT"}	2026-01-03 12:36:45.757
cmjyg0pbm000jkfi5dlsz201n	cmjx1izq70003i3dsywr57bcz	approved	status	\N	\N	PENDING_APPROVAL	APPROVED	cmjwvczk6000tk67yqfzvu89w	ok published (file also updated)	{"toStatus": "APPROVED", "timestamp": "2026-01-03T15:13:51.153Z", "fromStatus": "PENDING_APPROVAL"}	2026-01-03 15:13:51.154
cmjyg0z4x000pkfi5fkonybfy	cmjx1izq70003i3dsywr57bcz	published	status	\N	\N	APPROVED	PUBLISHED	cmjwvczk6000tk67yqfzvu89w	oke	{"toStatus": "PUBLISHED", "timestamp": "2026-01-03T15:14:03.872Z", "fromStatus": "APPROVED"}	2026-01-03 15:14:03.873
cmjzswvy9000hyrs19fumqfv3	seed-doc-7	file_replaced	file	"{\\"fileName\\":\\"draft-kebijakan-remote-working.docx\\",\\"filePath\\":\\"/uploads/documents/draft-kebijakan-remote-working.docx\\"}"	"{\\"fileName\\":\\"00vss1636966505.pdf\\",\\"filePath\\":\\"uploads/documents/1767535354285-00vss1636966505.pdf\\"}"	\N	\N	cmjwvd13i0015k67y5qg7w2qq	File updated from draft-kebijakan-remote-working.docx to 00vss1636966505.pdf	{"newFile": {"version": "0.4", "fileName": "00vss1636966505.pdf", "filePath": "uploads/documents/1767535354285-00vss1636966505.pdf"}, "oldFile": {"version": "0.3", "fileName": "draft-kebijakan-remote-working.docx", "filePath": "/uploads/documents/draft-kebijakan-remote-working.docx"}}	2026-01-04 14:02:34.306
cmjztdz09000ryrs11u3h7nvk	seed-doc-7	file_replaced	file	"{\\"fileName\\":\\"00vss1636966505.pdf\\",\\"filePath\\":\\"uploads/documents/1767535354285-00vss1636966505.pdf\\"}"	"{\\"fileName\\":\\"Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf\\",\\"filePath\\":\\"uploads/documents/1767536151395-Perban_BSSN_No_11_Tahun_2024_Penyelenggaraan_Algoritma_Kriptografi_Indonesia.pdf\\"}"	\N	\N	cmjwvd13i0015k67y5qg7w2qq	File updated from 00vss1636966505.pdf to Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf	{"newFile": {"version": "0.5", "fileName": "Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf", "filePath": "uploads/documents/1767536151395-Perban_BSSN_No_11_Tahun_2024_Penyelenggaraan_Algoritma_Kriptografi_Indonesia.pdf"}, "oldFile": {"version": "0.4", "fileName": "00vss1636966505.pdf", "filePath": "uploads/documents/1767535354285-00vss1636966505.pdf"}}	2026-01-04 14:15:51.418
cmjzv51hm000fbr218avdxv14	seed-doc-7	file_replaced	file	"{\\"fileName\\":\\"Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf\\",\\"filePath\\":\\"uploads/documents/1767536151395-Perban_BSSN_No_11_Tahun_2024_Penyelenggaraan_Algoritma_Kriptografi_Indonesia.pdf\\"}"	"{\\"fileName\\":\\"lampiran rkb.pdf\\",\\"filePath\\":\\"uploads/documents/1767539093944-lampiran_rkb.pdf\\"}"	\N	\N	cmjwvd13i0015k67y5qg7w2qq	File updated from Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf to lampiran rkb.pdf	{"newFile": {"version": "0.6", "fileName": "lampiran rkb.pdf", "filePath": "uploads/documents/1767539093944-lampiran_rkb.pdf"}, "oldFile": {"version": "0.5", "fileName": "Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf", "filePath": "uploads/documents/1767536151395-Perban_BSSN_No_11_Tahun_2024_Penyelenggaraan_Algoritma_Kriptografi_Indonesia.pdf"}}	2026-01-04 15:04:53.963
cmjzv51y5000jbr21do71lerr	seed-doc-7	status_changed	status	\N	\N	DRAFT	IN_REVIEW	cmjwvd13i0015k67y5qg7w2qq	kita review lagi (file also updated)	{"toStatus": "IN_REVIEW", "timestamp": "2026-01-04T15:04:54.557Z", "fromStatus": "DRAFT"}	2026-01-04 15:04:54.558
cmjzwhs8i0005wo7ojhezh8iu	seed-doc-3	file_replaced	file	"{\\"fileName\\":\\"ik-pengujian-software-preprod.pdf\\",\\"filePath\\":\\"/uploads/documents/ik-pengujian-software-preprod.pdf\\"}"	"{\\"fileName\\":\\"Puas Apriyampon CUTI Agustus  2025.pdf\\",\\"filePath\\":\\"uploads/documents/1767541368097-Puas_Apriyampon_CUTI_Agustus__2025.pdf\\"}"	\N	\N	cmjwvd13i0015k67y5qg7w2qq	File updated from ik-pengujian-software-preprod.pdf to Puas Apriyampon CUTI Agustus  2025.pdf	{"newFile": {"version": "1.4", "fileName": "Puas Apriyampon CUTI Agustus  2025.pdf", "filePath": "uploads/documents/1767541368097-Puas_Apriyampon_CUTI_Agustus__2025.pdf"}, "oldFile": {"version": "1.3", "fileName": "ik-pengujian-software-preprod.pdf", "filePath": "/uploads/documents/ik-pengujian-software-preprod.pdf"}}	2026-01-04 15:42:48.115
cmjzwhsoj0009wo7o6i38sb98	seed-doc-3	status_changed	status	\N	\N	DRAFT	IN_REVIEW	cmjwvd13i0015k67y5qg7w2qq	ok lanjut erview (file also updated)	{"toStatus": "IN_REVIEW", "timestamp": "2026-01-04T15:42:48.691Z", "fromStatus": "DRAFT"}	2026-01-04 15:42:48.691
cmjyafzin000pi83ajfybs21g	cmjx1izq70003i3dsywr57bcz	status_changed	status	\N	\N	IN_REVIEW	PENDING_APPROVAL	cmjwvczk6000tk67yqfzvu89w	Baik akan kami periksa terlebih dahulu (file also updated)	{"toStatus": "PENDING_APPROVAL", "timestamp": "2026-01-03T12:37:46.511Z", "fromStatus": "PENDING_REVIEW"}	2026-01-03 12:37:46.512
cmjztdzgd000vyrs1bp4ii4zt	seed-doc-7	status_changed	status	\N	\N	IN_REVIEW	DRAFT	cmjwvd13i0015k67y5qg7w2qq	masih ada revisi dan ini setelah revisi (file also updated)	{"toStatus": "DRAFT", "timestamp": "2026-01-04T14:15:51.997Z", "fromStatus": "PENDING_REVIEW"}	2026-01-04 14:15:51.997
cmjzswwe0000lyrs1palp6dj5	seed-doc-7	status_changed	status	\N	\N	DRAFT	IN_REVIEW	cmjwvd13i0015k67y5qg7w2qq	lanjut ke tahapan review bersama (file also updated)	{"toStatus": "PENDING_REVIEW", "timestamp": "2026-01-04T14:02:34.872Z", "fromStatus": "DRAFT"}	2026-01-04 14:02:34.873
cmk0im63y0005etf4xflicf6c	seed-doc-7	file_replaced	file	"{\\"fileName\\":\\"lampiran rkb.pdf\\",\\"filePath\\":\\"uploads/documents/1767539093944-lampiran_rkb.pdf\\"}"	"{\\"fileName\\":\\"tagihanwm_mei_2025.pdf\\",\\"filePath\\":\\"uploads/documents/1767578524252-tagihanwm_mei_2025.pdf\\"}"	\N	\N	cmjwvd13i0015k67y5qg7w2qq	File updated from lampiran rkb.pdf to tagihanwm_mei_2025.pdf	{"newFile": {"version": "0.7", "fileName": "tagihanwm_mei_2025.pdf", "filePath": "uploads/documents/1767578524252-tagihanwm_mei_2025.pdf"}, "oldFile": {"version": "0.6", "fileName": "lampiran rkb.pdf", "filePath": "uploads/documents/1767539093944-lampiran_rkb.pdf"}}	2026-01-05 02:02:04.27
cmk0im6jp0009etf4hhqce7eb	seed-doc-7	status_changed	status	\N	\N	IN_REVIEW	DRAFT	cmjwvd13i0015k67y5qg7w2qq	cek lagi (file also updated)	{"toStatus": "DRAFT", "timestamp": "2026-01-05T02:02:04.837Z", "fromStatus": "IN_REVIEW"}	2026-01-05 02:02:04.838
cmk8ks6960005ak4k0cbjq3t4	cmk48uasq0001aknpg4y98xmw	status_changed	status	\N	\N	DRAFT	IN_REVIEW	cmjwvd13i0015k67y5qg7w2qq	masuk ke review	{"toStatus": "IN_REVIEW", "timestamp": "2026-01-10T17:24:53.033Z", "fromStatus": "DRAFT"}	2026-01-10 17:24:53.034
cmk8kz2p1000gak4kisvm5yt7	cmk48uasq0001aknpg4y98xmw	status_changed	status	\N	\N	IN_REVIEW	PENDING_APPROVAL	cmjwvd13i0011k67yhnsrcfug	masuk ke pending approval	{"toStatus": "PENDING_APPROVAL", "timestamp": "2026-01-10T17:30:15.012Z", "fromStatus": "IN_REVIEW"}	2026-01-10 17:30:15.013
cmk8l06ks000pak4k2pxhfv9m	cmk48uasq0001aknpg4y98xmw	file_replaced	file	"{\\"fileName\\":\\"1766687250875-06_PROS-91-PROSEDUR_PIR2.pdf\\",\\"filePath\\":\\"/uploads/documents/5b5f83ba-27cb-4631-93ef-c3053ef7ad07.pdf\\"}"	"{\\"fileName\\":\\"ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf\\",\\"filePath\\":\\"uploads/documents/1768066266685-ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf\\"}"	\N	\N	cmjwvd13i000zk67y38y267mg	File updated from 1766687250875-06_PROS-91-PROSEDUR_PIR2.pdf to ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf	{"newFile": {"version": "1.1", "fileName": "ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf", "filePath": "uploads/documents/1768066266685-ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf"}, "oldFile": {"version": "1.0", "fileName": "1766687250875-06_PROS-91-PROSEDUR_PIR2.pdf", "filePath": "/uploads/documents/5b5f83ba-27cb-4631-93ef-c3053ef7ad07.pdf"}}	2026-01-10 17:31:06.701
cmk8l070s000tak4kr8ivoorr	cmk48uasq0001aknpg4y98xmw	approved	status	\N	\N	PENDING_APPROVAL	APPROVED	cmjwvd13i000zk67y38y267mg	approved (file also updated)	{"toStatus": "APPROVED", "timestamp": "2026-01-10T17:31:07.276Z", "fromStatus": "PENDING_APPROVAL"}	2026-01-10 17:31:07.277
cmkm7lpwb0009akwo079a6473	cmjx1izq70003i3dsywr57bcz	status_changed	status	\N	\N	PUBLISHED	IN_REVIEW	cmjwvczk6000tk67yqfzvu89w	Kita akan melakukan revisi untuk dokumen ini	{"toStatus": "IN_REVIEW", "timestamp": "2026-01-20T06:24:43.354Z", "fromStatus": "PUBLISHED"}	2026-01-20 06:24:43.355
cmkm7njsp000fakwod2gylyn0	cmjx1izq70003i3dsywr57bcz	file_replaced	file	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR5.pdf\\",\\"filePath\\":\\"uploads/documents/1767453230546-06_PROS-91-PROSEDUR_PIR5.pdf\\"}"	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR5 (2).pdf\\",\\"filePath\\":\\"uploads/documents/1768890368717-06_PROS-91-PROSEDUR_PIR5__2_.pdf\\"}"	\N	\N	cmjwvczk6000tk67yqfzvu89w	File updated from 06 PROS-91-PROSEDUR PIR5.pdf to 06 PROS-91-PROSEDUR PIR5 (2).pdf	{"newFile": {"version": "2.1", "fileName": "06 PROS-91-PROSEDUR PIR5 (2).pdf", "filePath": "uploads/documents/1768890368717-06_PROS-91-PROSEDUR_PIR5__2_.pdf"}, "oldFile": {"version": "2.0", "fileName": "06 PROS-91-PROSEDUR PIR5.pdf", "filePath": "uploads/documents/1767453230546-06_PROS-91-PROSEDUR_PIR5.pdf"}}	2026-01-20 06:26:08.761
cmkm7nk8k000jakwox1531mmh	cmjx1izq70003i3dsywr57bcz	status_changed	status	\N	\N	IN_REVIEW	PENDING_APPROVAL	cmjwvczk6000tk67yqfzvu89w	Lanjut sekarang ke pending approval (file also updated)	{"toStatus": "PENDING_APPROVAL", "timestamp": "2026-01-20T06:26:09.332Z", "fromStatus": "IN_REVIEW"}	2026-01-20 06:26:09.333
cmkm7oau2000pakwo56g8nm02	cmjx1izq70003i3dsywr57bcz	file_replaced	file	"{\\"fileName\\":\\"06 PROS-91-PROSEDUR PIR5 (2).pdf\\",\\"filePath\\":\\"uploads/documents/1768890368717-06_PROS-91-PROSEDUR_PIR5__2_.pdf\\"}"	"{\\"fileName\\":\\"1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf\\",\\"filePath\\":\\"uploads/documents/1768890403658-1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf\\"}"	\N	\N	cmjwvczk6000tk67yqfzvu89w	File updated from 06 PROS-91-PROSEDUR PIR5 (2).pdf to 1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf	{"newFile": {"version": "2.2", "fileName": "1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf", "filePath": "uploads/documents/1768890403658-1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf"}, "oldFile": {"version": "2.1", "fileName": "06 PROS-91-PROSEDUR PIR5 (2).pdf", "filePath": "uploads/documents/1768890368717-06_PROS-91-PROSEDUR_PIR5__2_.pdf"}}	2026-01-20 06:26:43.803
cmkm7ob9r000takwobzmevpsy	cmjx1izq70003i3dsywr57bcz	approved	status	\N	\N	PENDING_APPROVAL	APPROVED	cmjwvczk6000tk67yqfzvu89w	Oke lanjut (file also updated)	{"toStatus": "APPROVED", "timestamp": "2026-01-20T06:26:44.367Z", "fromStatus": "PENDING_APPROVAL"}	2026-01-20 06:26:44.367
cmkm7oh3s000zakwow8ryn8se	seed-doc-10	approved	status	\N	\N	PENDING_APPROVAL	APPROVED	cmjwvczk6000tk67yqfzvu89w	oke	{"toStatus": "APPROVED", "timestamp": "2026-01-20T06:26:51.928Z", "fromStatus": "PENDING_APPROVAL"}	2026-01-20 06:26:51.929
\.


--
-- Data for Name: document_relations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_relations (id, parent_id, child_id, relation_type, sort_order, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: document_search_scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_search_scores (document_id, popularity_score, status_boost, last_updated, view_count, download_count, comment_count) FROM stdin;
seed-doc-6	6.67675380226828	1.5	2026-01-26 05:00:25.15378	179	56	0
seed-doc-2	6.91079664404053	1.5	2026-01-26 05:00:25.15378	234	67	0
seed-doc-4	8.64060382639363	1.5	2026-01-26 05:00:25.15378	1456	312	0
seed-doc-1	8.07665381544395	1.5	2026-01-26 05:00:25.15378	893	145	0
seed-doc-9	7.9037472575846	1.5	2026-01-26 05:00:25.15378	683	156	0
test-live-2026-01-03-10-20-19	3.89037175789616	1.0	2026-01-26 05:00:25.15378	17	0	0
seed-doc-7	5.36944785246702	1.0	2026-01-26 05:00:25.15378	52	13	0
seed-doc-5	7.4377516497364	1.5	2026-01-26 05:00:25.15378	446	89	0
seed-doc-8	5.15888308335967	1.0	2026-01-26 05:00:25.15378	47	8	0
cmkaqj9vt0001akka05undnqg	3.77258872223978	1.0	2026-01-26 05:00:25.15378	15	0	0
cmkmb5l8z001cakwo5vfhup1t	1	1.0	2026-01-26 05:00:25.15378	0	0	0
seed-doc-10	6.03043792139244	1.3	2026-01-26 05:00:25.15378	96	28	0
cmk0iulms000netf46d0s4ofw	4.91202300542815	1.0	2026-01-26 05:00:25.15378	47	1	0
cmk48uasq0001aknpg4y98xmw	5.02535169073515	1.3	2026-01-26 05:00:25.15378	51	2	0
seed-doc-3	5.92725368515721	1.0	2026-01-26 05:00:25.15378	91	23	0
cmkmb5l9l001gakwo7jikem1n	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5l9p001kakwo1gsenw1u	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5l9s001oakwof6xvi43i	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5l9x001sakwoi1bis2xc	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5la0001wakwosxiinhq2	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5la50020akwoeiks3juh	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5la90024akwooqy0b3sr	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lac0028akwock9bws46	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lag002cakwol5nczq42	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lal002kakwoknkwu9r9	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lao002oakwo69vve3gw	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lar002sakwo84dwmin3	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lat002wakwor26cmvpv	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lav0030akwoaq3vb20w	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lay0034akwoduunzudj	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lb00038akwo1qsehmzf	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lb9003gakwoxi9ftf1c	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbi003oakwomkauam9j	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbm003sakwouz15443o	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbp003wakwo6obkxey8	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbs0040akwo94jye0dq	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbu0044akwofltq4n14	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbx0048akwog2jyt2bg	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbz004cakwo1kwyyz01	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lc1004gakwodc1n3w6k	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lc3004kakwod9rwjc55	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lc5004oakwouiyierv5	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lc7004sakwolvxqp920	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lca004wakwonpu7uv5o	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcc0050akwo3hz0t2p8	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcg0054akwoa507tiq0	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lck0058akwolngtyn6n	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcn005cakwowv0sssk1	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcq005gakwosyrgmx9r	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcs005kakwof6q4cphi	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcv005oakwoqq1lm718	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcx005sakwo5bn6moa9	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lcz005wakwo1wg9so7r	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ld10060akwoxfo47wzo	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ld40064akwoqscgmc1b	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ld60068akwokxhlad94	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ld9006cakwo5up1sqqn	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ldb006gakwobs254dsz	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lde006kakwofnprtyrg	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ldg006oakwowlnjde8g	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ldi006sakwow6v1tudm	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ldl006wakwopfpbv2jg	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ldo0070akwojznr3l8a	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ldq0074akwor4fitktx	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lds0078akwosmz1tis4	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5le8007cakwo8iks5qdm	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lem007gakwob4xa5eum	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ler007kakwolfttlqmp	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5let007oakwoxywsdqaq	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lew007sakwof8rqn02i	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ley007wakwopyr25i8q	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lf10080akwos0rrmmyk	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lf30084akwo1i83nzay	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lf60088akwoofb7wywj	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lf9008cakwonanryd15	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfb008gakwoacqjgsfs	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfe008kakwo1otl3ccx	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfh008oakwojkaktj35	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfk008sakwo9elf0ik0	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfn008wakwo6zf5i4jj	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfq0090akwoxkd07trc	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lft0094akwoxvdlhedq	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfv0098akwoftb8sxp0	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lfy009cakwofl5wtmub	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lg0009gakwo4wxlhhfd	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lg3009kakwo47he49oz	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lg6009oakwo1f4sximt	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lg9009sakwo5mshgw31	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lgc009wakwo8bmw86g0	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lgf00a0akwo8g5kdtiv	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lgh00a4akwok77nqjs7	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lgp00a8akwo9ag4dr57	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lgx00akakwojutj7ly6	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lh700awakwoypeb3suj	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lhg00b8akwor3sevkvw	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lhp00bkakwojjfz5orh	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lhr00boakwo4ufbb690	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lhv00bsakwohd1ny3cc	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lhy00bwakwo8fr0eo1y	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5li100c0akwox96b0i4y	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5li700c8akwomovz5jip	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lib00ccakwoc1bjbkq6	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lie00cgakwo8aimoqgy	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lih00ckakwovbac2rcq	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lik00coakwo3gym8yxl	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lin00csakwok7dwores	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5liq00cwakwoum0g3je7	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lit00d0akwoc5m2v2uy	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5liw00d4akwo4p7y59wk	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5liz00d8akwoq30sz3xm	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lj200dcakwod1s8kqnh	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lj500dgakwo45j0q7ml	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lj800dkakwomvhrkt7i	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ljl00e0akwok7pnj87m	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ljp00e4akwo8v1xwwuu	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ljs00e8akwop5sl42mk	1	1.0	2026-01-26 05:00:25.15378	0	0	0
cmkmb5li400c4akwokro8v522	2.6094379124341	1.0	2026-01-26 05:00:25.15378	4	0	0
cmkmb5lhj00bcakwo1pcwnwze	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ljf00dsakwoweu3lhfq	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmjx1izq70003i3dsywr57bcz	5.84418708645859	1.3	2026-01-26 05:00:25.15378	100	13	0
cmkmb5lai002gakwoxgpyw3d1	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lb4003cakwov52jmw5l	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lbe003kakwodglfr7ck	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lgv00agakwoad9gslek	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lh100aoakwo6kp3q2g5	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lh400asakwoqw9nzqsx	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lha00b0akwonllqx2pe	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lhd00b4akwo53pgqes7	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lhm00bgakwowhlhw1n3	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5ljb00doakwogpwg8m30	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lji00dwakwo8x89584s	1	1.5	2026-01-26 05:00:25.15378	0	0	0
cmkmb5lgs00acakwo6eapi10r	5.26267987704132	1.5	2026-01-26 05:00:25.15378	50	10	0
\.


--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_versions (id, document_id, version, changes, file_name, file_path, file_size, previous_version, created_by_id, created_at, parent_version_id) FROM stdin;
cmjx1e3qd003r9kwjrtht15ge	seed-doc-2	1.0	Initial backup procedure documentation	prosedur-backup-database-v1.0.pdf	/uploads/documents/versions/prosedur-backup-database-v1.0.pdf	890000	\N	cmjwvd13i0017k67yccjxnpiz	2024-01-20 09:00:00	\N
cmjx1e3qd003x9kwj46ztu35w	seed-doc-2	2.0	Added automated backup scripts and recovery testing procedures	prosedur-backup-database-v2.0.pdf	/uploads/documents/versions/prosedur-backup-database-v2.0.pdf	985000	1.0	cmjwvd13i0017k67yccjxnpiz	2024-01-28 11:00:00	\N
cmjx1e3qd003t9kwj04rx64tt	seed-doc-1	1.0	Initial release of quality management guide	panduan-smm-iso-9001-2015-v1.0.pdf	/uploads/documents/versions/panduan-smm-iso-9001-2015-v1.0.pdf	2100000	\N	cmjwvczk6000tk67yqfzvu89w	2024-01-10 10:00:00	\N
cmjx1e3qd003u9kwjj9j07p6r	seed-doc-1	3.0	Major revision: Added risk management procedures and updated audit procedures	panduan-smm-iso-9001-2015-v3.0.pdf	/uploads/documents/versions/panduan-smm-iso-9001-2015-v3.0.pdf	2548000	2.0	cmjwvd13i0011k67yhnsrcfug	2024-01-14 14:00:00	\N
cmjx1e3qd003y9kwjv9l7b5c7	seed-doc-2	2.1	Minor update: Fixed typos and clarified retention policies	prosedur-backup-database-v2.1.pdf	/uploads/documents/versions/prosedur-backup-database-v2.1.pdf	1024500	2.0	cmjwvd13i0017k67yccjxnpiz	2024-01-30 14:00:00	\N
cmjyabt390001i83ag09ejcoe	cmjx1izq70003i3dsywr57bcz	1.0	Previous version before file update to 06 PROS-91-PROSEDUR PIR3 .pdf	06 PROS-91-PROSEDUR PIR2.pdf	/uploads/documents/4f6ca6c0-1e86-42a8-b6ce-9ceac8686936.pdf	8719697	\N	cmjwvczk6000tk67yqfzvu89w	2026-01-03 12:34:31.554	\N
cmjyaeo5a0009i83apmo7uik7	cmjx1izq70003i3dsywr57bcz	1.2	Previous version before file update to 06 PROS-91-PROSEDUR PIR3 .pdf	06 PROS-91-PROSEDUR PIR3 .pdf	uploads/documents/1767443708113-06_PROS-91-PROSEDUR_PIR3_.pdf	8719697	\N	cmjwvczk6000tk67yqfzvu89w	2026-01-03 12:36:45.119	\N
cmjyafz1k000ji83aumy1btp2	cmjx1izq70003i3dsywr57bcz	1.3	Previous version before file update to 06 PROS-91-PROSEDUR PIR4.pdf	06 PROS-91-PROSEDUR PIR3 .pdf	uploads/documents/1767443805108-06_PROS-91-PROSEDUR_PIR3_.pdf	8719697	\N	cmjwvczk6000tk67yqfzvu89w	2026-01-03 12:37:45.897	\N
cmjzswvxt000fyrs1v276gmp1	seed-doc-7	0.3	Previous version before file update to 00vss1636966505.pdf	draft-kebijakan-remote-working.docx	/uploads/documents/draft-kebijakan-remote-working.docx	324000	\N	cmjwvd13i0015k67y5qg7w2qq	2026-01-04 14:02:34.287	\N
cmjyaclcq0005i83a7pyvmnt7	cmjx1izq70003i3dsywr57bcz	1.1	Previous version before file update to 06 PROS-91-PROSEDUR PIR3 .pdf	06 PROS-91-PROSEDUR PIR3 .pdf	uploads/documents/1767443671549-06_PROS-91-PROSEDUR_PIR3_.pdf	8719697	\N	cmjwvczk6000tk67yqfzvu89w	2026-01-03 12:35:08.186	\N
cmjztdyzq000pyrs1o0avfs45	seed-doc-7	0.4	Previous version before file update to Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf	00vss1636966505.pdf	uploads/documents/1767535354285-00vss1636966505.pdf	484890	\N	cmjwvd13i0015k67y5qg7w2qq	2026-01-04 14:15:51.397	\N
cmjyg0oux000dkfi5ou829v2c	cmjx1izq70003i3dsywr57bcz	1.4	Previous version before file update to 06 PROS-91-PROSEDUR PIR5.pdf	06 PROS-91-PROSEDUR PIR4.pdf	uploads/documents/1767443865885-06_PROS-91-PROSEDUR_PIR4.pdf	8719697	\N	cmjwvczk6000tk67yqfzvu89w	2026-01-03 15:13:50.553	\N
cmjx1e3qd003s9kwj30qv47h2	seed-doc-1	2.0	Updated compliance requirements and added process flowcharts	panduan-smm-iso-9001-2015-v2.0.pdf	/uploads/documents/versions/panduan-smm-iso-9001-2015-v2.0.pdf	2350000	1.0	cmjwvd13i0011k67yhnsrcfug	2024-01-12 14:00:00	\N
cmjzv51h6000dbr21f8nqtdzf	seed-doc-7	0.5	Previous version before file update to lampiran rkb.pdf	Perban BSSN No 11 Tahun 2024 Penyelenggaraan Algoritma Kriptografi Indonesia.pdf	uploads/documents/1767536151395-Perban_BSSN_No_11_Tahun_2024_Penyelenggaraan_Algoritma_Kriptografi_Indonesia.pdf	975094	\N	cmjwvd13i0015k67y5qg7w2qq	2026-01-04 15:04:53.946	\N
cmjzwhs830003wo7or2tk9zm6	seed-doc-3	1.3	Previous version before file update to Puas Apriyampon CUTI Agustus  2025.pdf	ik-pengujian-software-preprod.pdf	/uploads/documents/ik-pengujian-software-preprod.pdf	856200	\N	cmjwvd13i0015k67y5qg7w2qq	2026-01-04 15:42:48.098	\N
cmk0im63i0003etf4o93dlbbc	seed-doc-7	0.6	Previous version before file update to tagihanwm_mei_2025.pdf	lampiran rkb.pdf	uploads/documents/1767539093944-lampiran_rkb.pdf	515886	\N	cmjwvd13i0015k67y5qg7w2qq	2026-01-05 02:02:04.254	\N
cmk8l06kg000nak4k5iaas3qi	cmk48uasq0001aknpg4y98xmw	1.0	Previous version before file update to ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf	1766687250875-06_PROS-91-PROSEDUR_PIR2.pdf	/uploads/documents/5b5f83ba-27cb-4631-93ef-c3053ef7ad07.pdf	8719697	\N	cmjwvd13i000zk67y38y267mg	2026-01-10 17:31:06.688	\N
cmkm7njry000dakwonac1xju9	cmjx1izq70003i3dsywr57bcz	2.0	Previous version before file update to 06 PROS-91-PROSEDUR PIR5 (2).pdf	06 PROS-91-PROSEDUR PIR5.pdf	uploads/documents/1767453230546-06_PROS-91-PROSEDUR_PIR5.pdf	8719697	\N	cmjwvczk6000tk67yqfzvu89w	2026-01-20 06:26:08.733	\N
cmkm7oass000nakwowemznhgf	cmjx1izq70003i3dsywr57bcz	2.1	Previous version before file update to 1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf	06 PROS-91-PROSEDUR PIR5 (2).pdf	uploads/documents/1768890368717-06_PROS-91-PROSEDUR_PIR5__2_.pdf	8719697	\N	cmjwvczk6000tk67yqfzvu89w	2026-01-20 06:26:43.756	\N
cmkmbh8bu00eeakwo3vuxbun2	cmkmb5li400c4akwokro8v522	1.0	File updated from "" to "06 PROS-91-PROSEDUR PIR5.pdf"			\N	1.0	cmjwvczk6000tk67yqfzvu89w	2026-01-20 08:13:12.425	\N
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, title, description, file_name, file_path, file_size, file_type, mime_type, version, status, access_groups, download_count, view_count, tags, metadata, published_at, expires_at, created_at, updated_at, document_type_id, created_by_id, updated_by_id, approved_by_id, approved_at, extracted_text, extracted_at, extraction_status, hierarchy_level, hierarchy_path, parent_document_id, sort_order) FROM stdin;
seed-doc-6	Sertifikat ISO 9001:2015	Sertifikat ISO 9001:2015 yang diterbitkan oleh lembaga sertifikasi internasional untuk sistem manajemen mutu perusahaan.	sertifikat-iso-9001-2015.pdf	/uploads/documents/sertifikat-iso-9001-2015.pdf	425000	pdf	application/pdf	1.0	PUBLISHED	{}	56	179	{"ISO 9001",Sertifikat,Quality,External}	{"scope": "Quality Management System", "issuer": "TUV Rheinland", "issueDate": "2023-12-15", "expiryDate": "2026-12-14", "certificateNumber": "ISO-9001-2023-12345"}	2023-12-20 08:00:00	2026-12-14 23:59:59	2023-12-18 10:00:00	2026-01-03 15:08:02.031	cmjwvczbc000lk67yc5b5pks0	cmjwvczk6000tk67yqfzvu89w	\N	cmjwvczk6000tk67yqfzvu89w	2023-12-19 16:00:00	Certificate of Registration ISO 9001:2015. This is to certify that the quality management system...	2023-12-20 08:30:00	completed	0	\N	\N	0
seed-doc-2	Prosedur Backup dan Recovery Database	Standar operasional prosedur untuk melakukan backup dan recovery database sistem informasi perusahaan.	prosedur-backup-database-v2.pdf	/uploads/documents/prosedur-backup-database-v2.pdf	1024500	pdf	application/pdf	2.1	PUBLISHED	{}	67	234	{Database,Backup,Recovery,IT,Prosedur}	{"department": "Teknologi Informasi", "effectiveDate": "2024-02-01", "documentNumber": "SOP-TIK-003-2024", "nextReviewDate": "2025-02-01", "revisionNumber": 2}	2024-02-01 08:00:00	\N	2024-01-20 09:00:00	2026-01-03 12:43:54.663	cmjwvczbc000gk67ye98oxzz0	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0017k67yccjxnpiz	cmjwvd13i0011k67yhnsrcfug	2024-01-30 15:00:00	Standard Operating Procedure untuk backup dan recovery database PostgreSQL, MySQL, dan MongoDB...	2024-02-01 08:30:00	completed	0	\N	\N	0
seed-doc-4	Instruksi Kerja Umum: Penggunaan Email Korporat	Panduan penggunaan email korporat yang aman dan profesional untuk seluruh karyawan.	iku-penggunaan-email-korporat.pdf	/uploads/documents/iku-penggunaan-email-korporat.pdf	645000	pdf	application/pdf	1.0	PUBLISHED	{}	312	1456	{Email,Komunikasi,Keamanan,Policy}	{"department": "Human Resources", "effectiveDate": "2024-01-01", "documentNumber": "IKU-HRD-001-2024", "nextReviewDate": "2025-01-01", "revisionNumber": 1}	2024-01-05 08:00:00	\N	2024-01-02 10:00:00	2026-01-03 12:43:54.663	cmjwvczbc000jk67yw1r045wp	cmjwvczk6000tk67yqfzvu89w	\N	cmjwvczk6000tk67yqfzvu89w	2024-01-04 16:00:00	Panduan penggunaan email meliputi etika komunikasi, keamanan data, dan best practices...	2024-01-05 08:30:00	completed	0	\N	\N	0
seed-doc-1	Panduan Sistem Manajemen Mutu ISO 9001:2015	Panduan lengkap implementasi sistem manajemen mutu berdasarkan standar ISO 9001:2015 untuk seluruh unit kerja di perusahaan.	panduan-smm-iso-9001-2015.pdf	/uploads/documents/panduan-smm-iso-9001-2015.pdf	2548000	pdf	application/pdf	3.0	PUBLISHED	{}	145	894	{"ISO 9001","Sistem Manajemen",Mutu,Standar}	{"department": "Quality Assurance", "effectiveDate": "2024-01-01", "documentNumber": "PSM-001-2024", "nextReviewDate": "2025-01-01", "revisionNumber": 3}	2024-01-15 08:00:00	\N	2024-01-10 10:00:00	2026-01-26 05:13:33.536	cmjwvczbc000ik67y1rjyio3n	cmjwvczk6000tk67yqfzvu89w	cmjwvd13i0011k67yhnsrcfug	cmjwvczk6000tk67yqfzvu89w	2024-01-14 16:00:00	Panduan Sistem Manajemen Mutu ISO 9001:2015. Dokumen ini menjelaskan implementasi sistem manajemen mutu...	2024-01-15 09:00:00	completed	0	\N	\N	0
seed-doc-9	Standard Operating Procedure: Daily Operations Checklist	Checklist operasional harian untuk memastikan semua sistem berjalan normal dan mendeteksi masalah sejak dini.	sop-daily-operations-checklist.pdf	/uploads/documents/sop-daily-operations-checklist.pdf	678000	pdf	application/pdf	1.2	PUBLISHED	{}	156	683	{Operations,Daily,Checklist,SOP,Monitoring}	{"department": "Operations", "effectiveDate": "2024-02-01", "documentNumber": "SOP-OPS-008-2024", "nextReviewDate": "2024-08-01", "revisionNumber": 1}	2024-02-01 08:00:00	\N	2024-01-25 10:00:00	2026-01-20 04:18:09.38	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	cmjwvd13i0011k67yhnsrcfug	2024-01-30 16:00:00	Daily operations checklist meliputi: 1. Pemeriksaan sistem server, 2. Monitoring network, 3. Backup verification...	2024-02-01 08:30:00	completed	0	\N	\N	0
test-live-2026-01-03-10-20-19	LIVE TEST - 2026-01-03 10:20:19.363872+00	Created live at 2026-01-03 10:20:19.363872+00 - NOT from cache	test-live.pdf	/uploads/test-live.pdf	1024	\N	application/pdf	1.0	DRAFT	\N	0	17	\N	\N	\N	\N	2026-01-03 10:20:19.364	2026-01-20 06:40:43.787	cmjwvczbc000hk67yuku0hn1h	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	/test-live-2026-01-03-10-20-19	seed-doc-7	0
seed-doc-7	Kebijakan Kerja Remote dan Hybrid Working	Draft kebijakan pengaturan kerja remote dan hybrid working untuk meningkatkan fleksibilitas karyawan.	tagihanwm_mei_2025.pdf	uploads/documents/1767578524252-tagihanwm_mei_2025.pdf	40612	pdf	application/pdf	0.7	DRAFT	{ppd,administrator,kadiv}	13	52	{Remote,Hybrid,Policy,"Work From Home",Draft}	{"author": "HR Department", "draftVersion": 3, "documentNumber": "DRAFT-HRD-WFH-2024", "targetEffectiveDate": "2024-04-01"}	\N	\N	2024-02-20 09:00:00	2026-01-20 06:40:59.45	cmjwvczbc000kk67yfddpf5mc	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	\N	\N	\N	\N	pending	0	\N	\N	0
seed-doc-5	Struktur Organisasi dan Tata Kelola Perusahaan 2024	Bagan struktur organisasi perusahaan, deskripsi jabatan, dan mekanisme tata kelola korporat.	struktur-organisasi-2024.pdf	/uploads/documents/struktur-organisasi-2024.pdf	1824000	pdf	application/pdf	1.1	PUBLISHED	{}	89	446	{Organisasi,Struktur,"Tata Kelola",Corporate}	{"department": "Human Resources", "effectiveDate": "2024-01-01", "documentNumber": "INT-HRD-005-2024", "nextReviewDate": "2024-07-01", "revisionNumber": 1, "confidentialityLevel": "Internal"}	2024-01-08 08:00:00	\N	2024-01-05 11:00:00	2026-01-03 15:11:59.021	cmjwvczbc000kk67yfddpf5mc	cmjwvczk6000tk67yqfzvu89w	cmjwvd13i0011k67yhnsrcfug	cmjwvczk6000tk67yqfzvu89w	2024-01-07 16:00:00	Struktur organisasi PT XYZ terdiri dari Dewan Direksi, Dewan Komisaris, dan unit-unit kerja...	2024-01-08 08:45:00	completed	0	\N	\N	0
seed-doc-8	Prosedur Pengelolaan Dokumen Manual (Superseded)	Prosedur lama pengelolaan dokumen secara manual sebelum implementasi sistem digital. Dokumen ini telah digantikan.	prosedur-dokumen-manual-old.pdf	/uploads/documents/prosedur-dokumen-manual-old.pdf	1245000	pdf	application/pdf	2.0	ARCHIVED	{ppd,administrator,kadiv}	8	47	{Archived,Manual,Old,Superseded}	{"supersededBy": "Sistem Digital Document Management", "archiveReason": "Replaced by digital system", "documentNumber": "SOP-ADM-001-2020", "supersededDate": "2023-12-31"}	2020-01-10 08:00:00	\N	2020-01-05 10:00:00	2026-01-07 04:33:49.281	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	2020-01-08 16:00:00	Prosedur pengelolaan dokumen meliputi penerimaan, distribusi, penyimpanan, dan pemusnahan dokumen fisik...	2023-12-01 10:00:00	completed	0	\N	\N	0
cmkaqj9vt0001akka05undnqg	modul01	modul pembelajaran	modul01.pdf	/uploads/documents/971c4d4e-b9d3-4bee-8a44-667cb687ca16.pdf	1066634	.pdf	application/pdf	1.0	DRAFT	{}	0	15	{Pengusahaan,Pelanggan,"Air Baku"}	{"extractionError": "File not found: /uploads/documents/971c4d4e-b9d3-4bee-8a44-667cb687ca16.pdf", "extractionFailedAt": "2026-01-12T05:41:27.912Z"}	\N	\N	2026-01-12 05:41:27.881	2026-01-20 06:33:09.044	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	failed	2	cmk0iulms000netf46d0s4ofw/cmjx1izq70003i3dsywr57bcz/cmkaqj9vt0001akka05undnqg	cmjx1izq70003i3dsywr57bcz	0
cmkmb5l8z001cakwo5vfhup1t	Prosedur Penyusunan dan Penomoran Naskah Dinas	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.298Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.299	2026-01-20 08:04:09.299	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmk48uasq0001aknpg4y98xmw	Instruksi Kerja Prosedur 91 Post Implementation Review	sebuah dokumen yang dibutuhkan dalam hal teknis	ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf	uploads/documents/1768066266685-ND_310_Permohonan_Perubahan_dan_Penambahan_Fitur_Aplikasi_SIDSMT.pdf	471279	pdf	application/pdf	1.1	APPROVED	{}	7	51	{Teknologi}	{"extractionError": "File not found: /uploads/documents/5b5f83ba-27cb-4631-93ef-c3053ef7ad07.pdf", "extractionFailedAt": "2026-01-07T16:39:32.186Z"}	\N	\N	2026-01-07 16:39:32.138	2026-02-20 16:43:36.039	cmjwvczbc000hk67yuku0hn1h	cmjwvczk6000tk67yqfzvu89w	cmjwvd13i000zk67y38y267mg	cmjwvd13i000zk67y38y267mg	2026-01-10 17:31:07.264	\N	\N	failed	2	cmk0iulms000netf46d0s4ofw/cmjx1izq70003i3dsywr57bcz/cmk48uasq0001aknpg4y98xmw	cmjx1izq70003i3dsywr57bcz	0
cmkmb5l9l001gakwo7jikem1n	Prosedur Pengendalian Dokumen	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.321Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.322	2026-01-20 08:04:09.322	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5l9p001kakwo1gsenw1u	Prosedur Pengendalian Dokumen Bukti Kerja	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.325Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.325	2026-01-20 08:04:09.325	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmk0iulms000netf46d0s4ofw	Manajemen Data	ini adalah prosedur	01e95c20-830e-41db-8fca-ad1cdd4a8e50.pdf	/uploads/documents/7d993668-f7db-4481-8712-5f88e5879958.pdf	1381845	.pdf	application/pdf	1.0	DRAFT	{sptik}	3	51	{teknologi}	{"extractionError": "File not found: /uploads/documents/7d993668-f7db-4481-8712-5f88e5879958.pdf", "extractionFailedAt": "2026-01-05T02:08:37.673Z"}	\N	\N	2026-01-05 02:08:37.634	2026-02-20 16:31:13.245	cmjwvczbc000gk67ye98oxzz0	cmjwvd13i0017k67yccjxnpiz	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	failed	0	\N	\N	0
cmkmb5l9s001oakwof6xvi43i	Prosedur Rapat Tinjauan Manajemen	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.328Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.328	2026-01-20 08:04:09.328	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5l9x001sakwoi1bis2xc	Prosedur Audit Internal Sistem Manajemen	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.333Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.333	2026-01-20 08:04:09.333	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5la0001wakwosxiinhq2	Prosedur Penyusunan Rencana Kerja Dan Anggaran Perusahaan Perum Jasa Tirta II	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.336Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.336	2026-01-20 08:04:09.336	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5la50020akwoeiks3juh	Prosedur Pemantauan Dan Evaluasi Pelaksanaan Rencana Kerja	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.341Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.342	2026-01-20 08:04:09.342	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5la90024akwooqy0b3sr	Prosedur Rekruitmen Karyawan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.345Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.345	2026-01-20 08:04:09.345	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lac0028akwock9bws46	Prosedur Pendidikan Dan Pelatihan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.348Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.348	2026-01-20 08:04:09.348	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lag002cakwol5nczq42	Prosedur Pengendalian Keuangan Perusahaan Umum (Perum) Jasa Tirta II	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.351Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.352	2026-01-20 08:04:09.352	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lal002kakwoknkwu9r9	Prosedur Supervisi Teknik	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.357Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.358	2026-01-20 08:04:09.358	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lao002oakwo69vve3gw	Prosedur Perencanaan Realisasi Produk	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.360Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.361	2026-01-20 08:04:09.361	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lar002sakwo84dwmin3	Prosedur Operasi Jaringan Pengairan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.363Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.363	2026-01-20 08:04:09.363	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lat002wakwor26cmvpv	Prosedur Administrasi Barang Pergudangan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.365Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.366	2026-01-20 08:04:09.366	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lav0030akwoaq3vb20w	Prosedur Operasi Bendung	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.367Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.368	2026-01-20 08:04:09.368	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lay0034akwoduunzudj	Prosedur Penyediaan Air Baku Untuk PT. Sang Hyang Seri (Persero)	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.370Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.37	2026-01-20 08:04:09.37	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lb00038akwo1qsehmzf	Prosedur Pemantauan Dan Pengukuran Kepuasan Pemasok	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.372Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.372	2026-01-20 08:04:09.372	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lb9003gakwoxi9ftf1c	Prosedur Pengusahaan Air Baku	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.381Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.382	2026-01-20 08:04:09.382	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbi003oakwomkauam9j	Prosedur Pelaksanaan Penelitian Dan Pengembangan (LITBANG) Di Lingkungan Perum Jasa Tirta II	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.390Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.391	2026-01-20 08:04:09.391	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbm003sakwouz15443o	Prosedur Perencanaan Teknik	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.393Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.394	2026-01-20 08:04:09.394	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbp003wakwo6obkxey8	Prosedur Pelaksanaan Kalibrasi	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.397Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.397	2026-01-20 08:04:09.397	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbs0040akwo94jye0dq	Prosedur Survey Kepuasan Pelanggan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.400Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.4	2026-01-20 08:04:09.4	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbu0044akwofltq4n14	Prosedur Pengeringan Jaringan Irigasi	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.402Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.402	2026-01-20 08:04:09.402	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbx0048akwog2jyt2bg	Prosedur Pemantauan Dan Pelaporan Keselamatan Bendungan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.404Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.405	2026-01-20 08:04:09.405	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbz004cakwo1kwyyz01	Prosedur Inspeksi Saluran Bawah (TAILRACE) Bendungan IR.H.Juanda	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.406Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.407	2026-01-20 08:04:09.407	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lc1004gakwodc1n3w6k	Prosedur Pemantauan Kualitas Air Sungai / Saluran / Waduk	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.409Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.409	2026-01-20 08:04:09.409	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lc3004kakwod9rwjc55	Prosedur Evaluasi Hasil Analisis Buangan Limbah Cair Indsustri	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.411Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.411	2026-01-20 08:04:09.411	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lc5004oakwouiyierv5	Prosedur Pengendalian Dan Penanganan Ketidaksesuaian	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.413Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.414	2026-01-20 08:04:09.414	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lc7004sakwolvxqp920	Prosedur Penanganan Darurat Bencana	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.415Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.416	2026-01-20 08:04:09.416	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lca004wakwonpu7uv5o	Prosedur Analisis Data	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.417Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.418	2026-01-20 08:04:09.418	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcc0050akwo3hz0t2p8	Prosedur Pengendalian Bajir	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.420Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.42	2026-01-20 08:04:09.42	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcg0054akwoa507tiq0	Prosedur Rencana Mutu Operasi Penyediaan Air Baku Untuk Industri, PDAM DKI (PAM JAYA), Industri Dan PDAM Kota/Kabupaten	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.424Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.425	2026-01-20 08:04:09.425	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lck0058akwolngtyn6n	Prosedur Penanganan Keluhan Pelanggan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.428Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.428	2026-01-20 08:04:09.428	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcn005cakwowv0sssk1	Prosedur Penyusunan Laporan Manajemen	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.431Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.432	2026-01-20 08:04:09.432	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcq005gakwosyrgmx9r	Prosedur Penyusunan Perjanjian Kerja Bersama	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.434Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.434	2026-01-20 08:04:09.434	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcs005kakwof6q4cphi	Prosedur Inspeksi Keselamatan Dan Kesehatan Kerja	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.436Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.437	2026-01-20 08:04:09.437	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcv005oakwoqq1lm718	Prosedur Kepatuhan Peraturan Perundang-undangan Keselamatan Kerja	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.438Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.439	2026-01-20 08:04:09.439	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcx005sakwo5bn6moa9	Prosedur Identifikasi Potensi Bahaya Dan Pengendalian Risiko	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.441Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.441	2026-01-20 08:04:09.441	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lcz005wakwo1wg9so7r	Prosedur Permohonan Informasi	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.443Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.443	2026-01-20 08:04:09.443	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ld10060akwoxfo47wzo	Prosedur Alat Pelindung Diri	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.445Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.446	2026-01-20 08:04:09.446	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ld40064akwoqscgmc1b	Prosedur Komunikasi K3	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.448Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.449	2026-01-20 08:04:09.449	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ld60068akwokxhlad94	Prosedur Ijin Kerja K3	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.450Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.451	2026-01-20 08:04:09.451	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ld9006cakwo5up1sqqn	Prosedur Pengelolaan Pernyataan Keberatan & Penanganan Sengketa Informasi Publik	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.453Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.453	2026-01-20 08:04:09.453	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ldb006gakwobs254dsz	Prosedur Penyelesaian Piutang Perusahaan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.455Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.456	2026-01-20 08:04:09.456	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lde006kakwofnprtyrg	Prosedur Penetapan dan Pemuktakhiran serta Pendokumentasian Daftar Informasi Publik	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.458Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.458	2026-01-20 08:04:09.458	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ldg006oakwowlnjde8g	Prosedur Pemeliharaan Bangunan Gedung	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.460Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.461	2026-01-20 08:04:09.461	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ldi006sakwow6v1tudm	Prosedur Pengujian tentang Konseskuen dan Pendokumentasian Informasi yang dikecualikan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.462Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.463	2026-01-20 08:04:09.463	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ldl006wakwopfpbv2jg	Prosedur Pemeliharaan Kesehatan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.465Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.466	2026-01-20 08:04:09.466	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ldo0070akwojznr3l8a	Prosedur DPT DPTS	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.467Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.468	2026-01-20 08:04:09.468	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ldq0074akwor4fitktx	Operasi Hollow Cone Valve	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.470Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.47	2026-01-20 08:04:09.47	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lds0078akwosmz1tis4	Prosedur PROSEDUR MANAJEMEN RISIKO PERUSAHAAN	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.472Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.473	2026-01-20 08:04:09.473	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5le8007cakwo8iks5qdm	Prosedur Audit Sistem Manajemen Anti Penyuapan (SMAP)	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.488Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.489	2026-01-20 08:04:09.489	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lem007gakwob4xa5eum	Prosedur Fungsi Kepatuhan Anti Penyuapan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.502Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.503	2026-01-20 08:04:09.503	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ler007kakwolfttlqmp	Prosedur Pemantauan Pengukuran dan Analisi	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.506Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.507	2026-01-20 08:04:09.507	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5let007oakwoxywsdqaq	Prosedur Penyaluran PKBL	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.509Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.51	2026-01-20 08:04:09.51	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lew007sakwof8rqn02i	Prosedur Tindakan Korektif dan Peningkatan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.511Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.512	2026-01-20 08:04:09.512	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ley007wakwopyr25i8q	Prosedur Uji Kelayakan atau Due Diligence	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.514Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.514	2026-01-20 08:04:09.514	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lf10080akwos0rrmmyk	Prosedur Pengendalian Dokumen SMAP	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.517Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.517	2026-01-20 08:04:09.517	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lf30084akwo1i83nzay	Prosedur Pelepasan Barang Bekas Non Inventaris	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.519Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.52	2026-01-20 08:04:09.52	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lf60088akwoofb7wywj	Prosedur Pengelolaan Water Meter	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.522Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.523	2026-01-20 08:04:09.523	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lf9008cakwonanryd15	Prosedur Penghapusbukuan Aset Milik	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.525Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.525	2026-01-20 08:04:09.525	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfb008gakwoacqjgsfs	Prosedur Penyusunan Rencana Kerja Bulanan /Triwulanan (RKB/RKT)	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.527Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.528	2026-01-20 08:04:09.528	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfe008kakwo1otl3ccx	Pinjaman Modal Kerja Anak Perusahaan	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.530Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.531	2026-01-20 08:04:09.531	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfh008oakwojkaktj35	Prosedur Pengelolaan Konten Website Jasa Tirta II	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.533Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.534	2026-01-20 08:04:09.534	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfk008sakwo9elf0ik0	Prosedur Pengelolaan Arsip	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.536Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.537	2026-01-20 08:04:09.537	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfn008wakwo6zf5i4jj	Prosedur Penyusunan Cascading KPI dan Pemantauan Capaian KPI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.539Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.54	2026-01-20 08:04:09.54	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfq0090akwoxkd07trc	Prosedur Tinjauan Kontrak	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.542Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.543	2026-01-20 08:04:09.543	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lft0094akwoxvdlhedq	Prosedur Pengendalian Perancangan K3	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.545Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.545	2026-01-20 08:04:09.545	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfv0098akwoftb8sxp0	Prosedur Penanganan Bahan dan Limbah B3	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.547Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.548	2026-01-20 08:04:09.548	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lfy009cakwofl5wtmub	Prosedur Investigasi Kecelakaan Kerja dan Penyakit Akibat Kerja	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.550Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.55	2026-01-20 08:04:09.55	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lg0009gakwo4wxlhhfd	Prosedur Pemantauan Lingkungan Kerja	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.552Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.553	2026-01-20 08:04:09.553	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lg3009kakwo47he49oz	Prosedur Organisasi Penanggung Jawab Keselamatan Kerja	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.555Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.555	2026-01-20 08:04:09.555	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lg6009oakwo1f4sximt	Prosedur Penunjukan Pengurus Dana Pensiun	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.558Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.558	2026-01-20 08:04:09.558	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lg9009sakwo5mshgw31	Prosedur Pelaporan dan Penanggulangan Bahaya	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.560Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.561	2026-01-20 08:04:09.561	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lgc009wakwo8bmw86g0	Prosedur Bantuan Biaya Pembinaan Ketaqwaan Kepada Tuhan Yang Maha Esa	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.563Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.564	2026-01-20 08:04:09.564	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lgf00a0akwo8g5kdtiv	Prosedur Conctractor Safety Management System (CSMS)	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.566Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.567	2026-01-20 08:04:09.567	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lgh00a4akwok77nqjs7	PENGELOLAAN TRANSAKSI AIR MINUM CURAH DAN AIR BAKU SPAM REGIONAL JATILUHUR I	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.569Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.57	2026-01-20 08:04:09.57	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lgp00a8akwo9ag4dr57	Prosedur Audit Penerapan SMK2	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.577Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.578	2026-01-20 08:04:09.578	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lgx00akakwojutj7ly6	Prosedur Pendidikan dan Pelatihan Bidang SMK2	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.585Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.586	2026-01-20 08:04:09.586	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lh700awakwoypeb3suj	Prosedur Organisasi SMK2	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.595Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.595	2026-01-20 08:04:09.595	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lhg00b8akwor3sevkvw	Prosedur Pelaporan dan Investigasi Kejadian Kecelakaan, Kejadian Berbahaya, Kegagalan operasi dan/atau Gangguan Berdampak pada masyakarat	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.604Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.604	2026-01-20 08:04:09.604	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lhp00bkakwojjfz5orh	Prosedur Manajemen Layanan TI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.612Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.613	2026-01-20 08:04:09.613	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lhr00boakwo4ufbb690	Prosedur Perubahan TI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.615Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.616	2026-01-20 08:04:09.616	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lhv00bsakwohd1ny3cc	Prosedur Pengembangan Aplikasi	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.619Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.619	2026-01-20 08:04:09.619	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lhy00bwakwo8fr0eo1y	Prosedur Manajemen Rilis TI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.622Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.622	2026-01-20 08:04:09.622	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5li100c0akwox96b0i4y	Prosedur Manajemen Transisi Layanan Baru	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.625Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.625	2026-01-20 08:04:09.625	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5li700c8akwomovz5jip	Prosedur Manajemen Infrastruktur TI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.631Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.632	2026-01-20 08:04:09.632	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lib00ccakwoc1bjbkq6	Prosedur Manajemen Konfigurasi	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.635Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.635	2026-01-20 08:04:09.635	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lgs00acakwo6eapi10r	Prosedur Penanggulangan Kondisi Darurat Keselamatan Ketenagalistrikan	-			\N	\N	\N	1.0	PUBLISHED	{}	10	50	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.580Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.58	2026-01-20 08:04:09.58	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lie00cgakwo8aimoqgy	Prosedur Manajemen Insiden TI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.638Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.638	2026-01-20 08:04:09.638	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lih00ckakwovbac2rcq	Prosedur Manajemen Hak Ases	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.641Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.641	2026-01-20 08:04:09.641	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lik00coakwo3gym8yxl	Prosedur Keberlangsungan TI / IT DRP	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.644Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.644	2026-01-20 08:04:09.644	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lin00csakwok7dwores	Pros BCM	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.647Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.647	2026-01-20 08:04:09.647	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5liq00cwakwoum0g3je7	Prosedur Manajemen Proyek TI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.650Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.65	2026-01-20 08:04:09.65	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lit00d0akwoc5m2v2uy	Prosedur Analisa Biaya dan Manfaat (CBA)	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.653Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.653	2026-01-20 08:04:09.653	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5liw00d4akwo4p7y59wk	Prosedur Manajemen SLA	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.656Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.656	2026-01-20 08:04:09.656	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5liz00d8akwoq30sz3xm	Prosedur Manajemen Data	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.659Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.659	2026-01-20 08:04:09.659	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lj200dcakwod1s8kqnh	Prosedur Manajemen Inovasi TI	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.661Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.662	2026-01-20 08:04:09.662	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lj500dgakwo45j0q7ml	Prosedur Rencana Pemulihan Bencana TI (IT Disaster Recovery Plan)	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.664Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.665	2026-01-20 08:04:09.665	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lj800dkakwomvhrkt7i	Prosedur Pengusahaan Laboratorim	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.668Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.669	2026-01-20 08:04:09.669	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ljl00e0akwok7pnj87m	Prosedur Pengamanan Aset	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.681Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.682	2026-01-20 08:04:09.682	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ljp00e4akwo8v1xwwuu	Prosedur Penerimaan Kunjungan Obyek Vital Nasional	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.684Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.685	2026-01-20 08:04:09.685	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ljs00e8akwop5sl42mk	Evaluasi atas Efektivitas Sistem Pengendalian Internal	-			\N	\N	\N	1.0	DRAFT	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.687Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.688	2026-01-20 08:04:09.688	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5li400c4akwokro8v522	Prosedur PIR	merupakan dokumen untuk post impelementasi review	06 PROS-91-PROSEDUR PIR5.pdf	/uploads/documents/d99b0568-199e-4b9f-a97c-23ce4ef54894.pdf	8719697	.pdf	application/pdf	1.1	DRAFT	{}	3	9	{TIK}	{"extractionError": "File not found: /uploads/documents/d99b0568-199e-4b9f-a97c-23ce4ef54894.pdf", "extractionFailedAt": "2026-01-20T08:13:12.476Z"}	\N	2026-01-20 00:00:00	2026-01-20 08:04:09.629	2026-02-20 16:29:56.158	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	failed	0	\N	\N	0
cmkmb5lhj00bcakwo1pcwnwze	Prosedur Pengelolaan dan Pemantauan Pekerjaan Pihak Ketiga Keselamatan Ketenagalistrikan	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.606Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.607	2026-01-20 08:04:09.607	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ljf00dsakwoweu3lhfq	Prosedur Pengurusan Tarif Biaya Jasa Pengelolaan Sumber Daya Air (BJPSDA) Ke Kementerian PUPR	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.675Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.675	2026-01-20 08:04:09.675	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lai002gakwoxgpyw3d1	Prosedur Pemeliharaan Prasarana Sumber Day Air dan Listrik	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.354Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.354	2026-01-20 08:04:09.354	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lb4003cakwov52jmw5l	Prosedur Rencana Mutu Operasi Penyediaan Energi Listrik Ir.H.Djuanda Dan Pembangkit Listrik Tenaga Mini Hidro (PLTMH) Curug	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.376Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.376	2026-01-20 08:04:09.376	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lbe003kakwodglfr7ck	Prosedur Pengusahaan Penyediaan Dan Pemakaian Tenaga Listrik Non PLN Dan Perumahan	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.386Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.387	2026-01-20 08:04:09.387	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lgv00agakwoad9gslek	Prosedur Manajemen Informasi Keselamatan Ketenagalistrikan	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.582Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.583	2026-01-20 08:04:09.583	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lh100aoakwo6kp3q2g5	Prosedur Pengendalian Dokumen Keselamatan Ketenagalistrikan	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.589Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.589	2026-01-20 08:04:09.589	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lh400asakwoqw9nzqsx	Prosedur Administrasi Keselamatan Ketenagalistrika	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.592Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.592	2026-01-20 08:04:09.592	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lha00b0akwonllqx2pe	Prosedur Kepatuhan Perundang-undangan Keselamatan Ketenagalistrikan	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.597Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.598	2026-01-20 08:04:09.598	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lhd00b4akwo53pgqes7	Prosedur Manajemen Perubahan Keselamatan Ketenagalistrikan	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.601Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.601	2026-01-20 08:04:09.601	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmjx1izq70003i3dsywr57bcz	Prosedur Post Implementation Review	Dokumen PIR adalah singkatan yang memiliki beberapa arti, tergantung pada konteksnya, tetapi dua yang paling umum adalah Post Implementation Review	1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf	uploads/documents/1768890403658-1766690764832-06_PROS-91-PROSEDUR_PIR5.pdf	8719697	pdf	application/pdf	2.2	APPROVED	{}	28	113	{Teknologi}	{"extractionError": "File not found: /uploads/documents/4f6ca6c0-1e86-42a8-b6ce-9ceac8686936.pdf", "extractionFailedAt": "2026-01-02T15:40:24.078Z"}	2026-01-03 15:14:03.861	\N	2026-01-02 15:40:24.026	2026-02-20 16:29:51.509	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	2026-01-20 06:26:44.353	\N	\N	failed	1	cmk0iulms000netf46d0s4ofw/cmjx1izq70003i3dsywr57bcz	cmk0iulms000netf46d0s4ofw	1
cmkmb5lhm00bgakwowhlhw1n3	Prosedur  Pengelolaan Keandalam Opersi Pembangkitan Tenaga Listrik Keselamatan Ketenagalistrikan	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.609Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.61	2026-01-20 08:04:09.61	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5ljb00doakwogpwg8m30	Prosedur Pengusahaan Listrik PT PLN	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.671Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.672	2026-01-20 08:04:09.672	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
cmkmb5lji00dwakwo8x89584s	Prosedur Perjanjian Jual Beli Tenaga Listrik PLTA Ir. H. Djuanda antara PJT II\ndengan PT. PLN (Persero)	-			\N	\N	\N	1.0	PUBLISHED	{}	0	0	{}	{"fileStatus": "pending-upload", "importedAt": "2026-01-20T08:04:09.678Z", "importedBy": "System Administrator", "importSource": "csv-web-import"}	\N	\N	2026-01-20 08:04:09.679	2026-01-20 08:04:09.679	cmjwvczbc000gk67ye98oxzz0	cmjwvczk6000tk67yqfzvu89w	\N	\N	\N	\N	\N	pending	0	\N	\N	0
seed-doc-10	Proposal Implementasi AI untuk Document Classification	Proposal penggunaan teknologi AI dan machine learning untuk mengklasifikasikan dan mengindeks dokumen secara otomatis.	proposal-ai-document-classification.pdf	/uploads/documents/proposal-ai-document-classification.pdf	2145000	pdf	application/pdf	1.0	APPROVED	{gm,ppd,manager,administrator,kadiv}	28	98	{AI,"Machine Learning",Proposal,Innovation,Technology}	{"currency": "IDR", "timeline": "6 months", "approvers": ["kadiv@dsm.com", "gm@dsm.com"], "department": "Teknologi Informasi", "expectedROI": "3 years", "documentNumber": "PROP-TIK-002-2024", "proposedBudget": 150000000}	\N	\N	2024-02-25 09:00:00	2026-02-20 16:30:19.6	cmjwvczbc000kk67yfddpf5mc	cmjwvd13i0017k67yccjxnpiz	cmjwvczk6000tk67yqfzvu89w	cmjwvczk6000tk67yqfzvu89w	2026-01-20 06:26:51.911	Executive Summary: Proposal ini mengusulkan implementasi sistem AI untuk klasifikasi dokumen otomatis...	2024-03-01 10:00:00	completed	0	\N	\N	0
seed-doc-3	Instruksi Kerja Khusus: Pengujian Software Pre-Production	Instruksi kerja detail untuk melakukan pengujian aplikasi sebelum deployment ke environment production.	Puas Apriyampon CUTI Agustus  2025.pdf	uploads/documents/1767541368097-Puas_Apriyampon_CUTI_Agustus__2025.pdf	79794	pdf	application/pdf	1.4	IN_REVIEW	{ppd,administrator,kadiv}	27	91	{Testing,Software,QA,Deployment}	{"reviewers": ["ppd@dsm.com", "kadiv@dsm.com"], "department": "Teknologi Informasi", "effectiveDate": "2024-03-01", "documentNumber": "IK-TIK-012-2024", "nextReviewDate": "2024-09-01", "revisionNumber": 1}	\N	\N	2024-02-10 13:00:00	2026-02-20 16:43:46.691	cmjwvczbc000hk67yuku0hn1h	cmjwvd13i0015k67y5qg7w2qq	cmjwvd13i0015k67y5qg7w2qq	\N	\N	Instruksi kerja untuk pengujian fungsional, integrasi, dan performa aplikasi sebelum go-live...	2024-02-15 10:00:00	completed	0	\N	\N	0
\.


--
-- Data for Name: documents_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents_type (id, name, slug, description, icon, color, access_level, required_approval, retention_period, is_active, sort_order, created_at) FROM stdin;
cmjwvczbc000hk67yuku0hn1h	Instruksi Kerja Bersifat Khusus	instruksi-kerja-khusus	Instruksi kerja untuk keperluan khusus departemen	🎯	#d97706	5	t	730	t	3	2026-01-02 12:47:45.865
cmjwvczbc000gk67ye98oxzz0	Prosedur	prosedur	Dokumen prosedur operasional standar	⚙️	#ea580c	6	t	1095	t	2	2026-01-02 12:47:45.865
cmjwvczbc000jk67yw1r045wp	Instruksi Kerja Bersifat Umum	instruksi-kerja-umum	Instruksi kerja umum untuk seluruh karyawan	📝	#16a34a	3	f	365	t	4	2026-01-02 12:47:45.865
cmjwvczbc000mk67ytwvk56xq	Dokumen Eksternal SMK3	dokumen-eksternal-smk3	Dokumen SMK3 dari pihak eksternal	🛡️	#dc2626	6	t	2190	t	7	2026-01-02 12:47:45.865
cmjwvczbc000lk67yc5b5pks0	Dokumen Eksternal	dokumen-eksternal	Dokumen dari pihak eksternal	🌐	#8b5cf6	2	f	1095	t	6	2026-01-02 12:47:45.865
cmjwvczbc000kk67yfddpf5mc	Dokumen Internal	dokumen-internal	Dokumen internal perusahaan	🏢	#0ea5e9	4	f	730	t	5	2026-01-02 12:47:45.865
cmjwvczbc000ik67y1rjyio3n	Panduan Sistem Manajemen	panduan-sistem-manajemen	Dokumen panduan sistem manajemen perusahaan	📋	#dc2626	8	t	1825	t	1	2026-01-02 12:47:45.865
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.groups (id, name, display_name, description, created_at, is_active) FROM stdin;
cmjwvcza80000k67ykjirfx3a	gm	General Manager	Manajer umum dengan akses tingkat tinggi, oversight operasional, dan wewenang strategis untuk seluruh divisi	2026-01-02 12:47:45.824	t
cmjwvczai0001k67y8myr0k7g	ppd	Penanggung Jawab Dokumen (PPD)	Bertanggung jawab atas pengelolaan dokumen perusahaan, review, persetujuan, dan distribusi dokumen strategis	2026-01-02 12:47:45.824	t
cmjwvczao0003k67ynse9ephd	dirut	Direktur Utama	Pemimpin eksekutif perusahaan dengan kewenangan tertinggi, pengambil keputusan strategis, dan akses ke semua dokumen confidential	2026-01-02 12:47:45.824	t
cmjwvczao0002k67yq245colh	sekretaris	Sekretaris/Admin	Sekretaris dan staff administrasi dengan akses ke dokumen administratif dan korespondensi	2026-01-02 12:47:45.824	t
cmjwvczap0004k67y2ltfecdg	staff	Staff Karyawan	Karyawan regular dengan akses ke dokumen operasional sesuai departemen dan tanggung jawab kerja	2026-01-02 12:47:45.824	t
cmjwvczaq0005k67yp0qjsbo2	dewas	Dewan Pengawas	Badan pengawas independen dengan akses ke laporan keuangan, audit, dan dokumen governance perusahaan	2026-01-02 12:47:45.824	t
cmjwvczat0009k67ytkof2mqb	supervisor	Supervisor	Supervisor tim dengan tanggung jawab pengawasan operasional harian dan koordinasi dengan manajemen	2026-01-02 12:47:45.824	t
cmjwvczat0008k67yul5jkqdv	tik	Bidang Teknologi Informasi & Komunikasi	Bidang TIK dengan akses ke dokumen teknis, sistem, dan infrastruktur IT	2026-01-02 12:47:45.825	t
cmjwvczat000bk67ybnzkqrq8	manager	Manager	Manajer departemen dengan tanggung jawab operasional, supervisi tim, dan koordinasi dengan divisi lain	2026-01-02 12:47:45.824	t
cmjwvczas0006k67yo6ho99cz	guest	Guest/Tamu	Akses terbatas hanya untuk dokumen publik dan informasi umum perusahaan	2026-01-02 12:47:45.824	t
cmjwvczas0007k67yscjh1kf2	administrator	System Administrator	Administrator sistem dengan akses penuh untuk konfigurasi, manajemen user, backup data, dan maintenance sistem	2026-01-02 12:47:45.824	t
cmjwvczau000ek67yvmqt5flw	operations	Operations	Departemen operasional dengan akses ke dokumen operasional dan prosedur kerja	2026-01-02 12:47:45.825	t
cmjwvczat000ck67ydhlp8obl	kadiv	Kepala Divisi	Pemimpin divisi dengan wewenang persetujuan dokumen divisi, koordinasi lintas departemen, dan pelaporan ke manajemen	2026-01-02 12:47:45.824	t
cmjwvczau000dk67yc8qwbct9	komite_audit	Komite Audit	Komite independen untuk review dan evaluasi sistem pengendalian internal, laporan keuangan, dan compliance	2026-01-02 12:47:45.824	t
cmjwvczat000ak67y2dt5oyx6	sptik	Divisi SPTIK	Divisi Strategi Perusahaan dan TIK	2026-01-02 12:47:45.825	t
cmjwvczau000fk67yx9qjt75q	sekper	Sekretariat Perusahaan	Departemen Sekper dengan akses ke dokumen dan peraturan	2026-01-02 12:47:45.825	t
\.


--
-- Data for Name: menu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu (id, name, url, icon, parent_id, sort_order, access_groups, is_active, created_at) FROM stdin;
upload	Upload Dokumen	/documents/upload	⬆️	\N	3	{administrator,ppd,kadiv,manager}	t	2026-01-02 14:24:00.176
admin	Administrasi	/admin	⚙️	\N	5	{administrator}	t	2026-01-02 14:24:00.176
documents	Dokumen	/documents	📄	\N	2	{administrator,ppd,kadiv,gm,manager,dirut,dewas,komite_audit,staff,operations,tik,finance,hrd}	t	2026-01-02 14:24:00.176
dashboard	Dashboard	/dashboard	🏠	\N	1	{administrator,ppd,kadiv,gm,manager,dirut,dewas,komite_audit,staff,operations,tik,finance,hrd}	t	2026-01-02 14:24:00.176
users	Pengguna	/users	👥	\N	4	{administrator,ppd}	t	2026-01-02 14:24:00.176
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, type, data, is_read, read_at, expires_at, created_at) FROM stdin;
cmk8ks69k0008ak4k1t9r18c6	cmjwvczk6000tk67yqfzvu89w	Document Status Changed	Your document "Instruksi Kerja Prosedur 91 Post Implementation Review" status has been changed to IN_REVIEW. masuk ke review	SYSTEM_MAINTENANCE	{"comment": "masuk ke review", "changedBy": "cmjwvd13i0015k67y5qg7w2qq", "documentId": "cmk48uasq0001aknpg4y98xmw", "statusChange": {"to": "IN_REVIEW", "from": "DRAFT"}}	f	\N	\N	2026-01-10 17:24:53.048
cmk8kz2p6000jak4k8yyh1fmt	cmjwvczk6000tk67yqfzvu89w	Document Status Changed	Your document "Instruksi Kerja Prosedur 91 Post Implementation Review" status has been changed to PENDING_APPROVAL. masuk ke pending approval	SYSTEM_MAINTENANCE	{"comment": "masuk ke pending approval", "changedBy": "cmjwvd13i0011k67yhnsrcfug", "documentId": "cmk48uasq0001aknpg4y98xmw", "statusChange": {"to": "PENDING_APPROVAL", "from": "IN_REVIEW"}}	f	\N	\N	2026-01-10 17:30:15.018
cmk8l070w000wak4kb1mt08v8	cmjwvczk6000tk67yqfzvu89w	Document Approved	Your document "Instruksi Kerja Prosedur 91 Post Implementation Review" has been approved. approved	DOCUMENT_APPROVED	{"comment": "approved", "changedBy": "cmjwvd13i000zk67y38y267mg", "documentId": "cmk48uasq0001aknpg4y98xmw", "statusChange": {"to": "APPROVED", "from": "PENDING_APPROVAL"}}	f	\N	\N	2026-01-10 17:31:07.281
cmkm7oh430012akwosm9ga6fe	cmjwvd13i0017k67yccjxnpiz	Document Approved	Your document "Proposal Implementasi AI untuk Document Classification" has been approved. oke	DOCUMENT_APPROVED	{"comment": "oke", "changedBy": "cmjwvczk6000tk67yqfzvu89w", "documentId": "seed-doc-10", "statusChange": {"to": "APPROVED", "from": "PENDING_APPROVAL"}}	f	\N	\N	2026-01-20 06:26:51.939
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, name, display_name, description, module, action, resource, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: ppd; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ppd (id, user_id, divisi_id, document_type_ids, is_active, assigned_at, assigned_by_id) FROM stdin;
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resources (id, type, path, name, description, parent_id, required_capability, icon, sort_order, is_active, metadata, created_at, updated_at) FROM stdin;
nav-admin	navigation	/admin	Admin	System administration	\N	ADMIN_ACCESS	Settings	10	t	\N	2026-01-02 13:20:36.383	2026-01-02 14:01:18.389
nav-admin-rbac-resources	navigation	/admin/rbac/resources	RBAC Resources	Manage navigation, routes, and API resources	nav-admin	ADMIN_ACCESS	Network	3	t	\N	2026-01-02 13:20:36.387	2026-01-02 14:01:18.397
nav-dashboard	navigation	/dashboard	Dashboard	Main dashboard	\N	\N	LayoutDashboard	1	t	{"visibleToGuest": true}	2026-01-02 13:20:36.364	2026-01-02 14:01:18.36
nav-admin-rbac-assignments	navigation	/admin/rbac/assignments	RBAC Assignments	Manage role-capability assignments	nav-admin	ADMIN_ACCESS	Shield	5	t	\N	2026-01-02 13:20:36.388	2026-01-02 14:01:18.4
nav-analytics	navigation	/analytics	Analytics	Analytics and reports	\N	ANALYTICS_VIEW	BarChart3	3	t	\N	2026-01-02 13:20:36.391	2026-01-02 14:01:18.408
nav-profile	navigation	/profile	Profile	User profile	\N	\N	User	100	t	\N	2026-01-02 13:20:36.393	2026-01-02 14:01:18.411
route-dashboard	route	/dashboard	Dashboard Route	\N	\N	\N	\N	0	t	\N	2026-01-02 13:20:36.393	2026-01-02 14:01:18.413
route-documents	route	/documents	Documents Route	\N	\N	DOCUMENT_VIEW	\N	0	t	\N	2026-01-02 13:20:36.395	2026-01-02 14:01:18.417
route-documents-edit	route	/documents/:id/edit	Edit Document Route	\N	\N	DOCUMENT_EDIT	\N	0	t	\N	2026-01-02 13:20:36.398	2026-01-02 14:01:18.42
route-admin	route	/admin	Admin Route	\N	\N	ADMIN_ACCESS	\N	0	t	\N	2026-01-02 13:20:36.399	2026-01-02 14:01:18.423
route-admin-users	route	/admin/users	User Management Route	\N	\N	USER_MANAGE	\N	0	t	\N	2026-01-02 13:20:36.399	2026-01-02 14:01:18.426
route-admin-roles	route	/admin/roles	Role Management Route	\N	\N	ROLE_MANAGE	\N	0	t	\N	2026-01-02 13:20:36.401	2026-01-02 14:01:18.429
route-admin-rbac-resources	route	/admin/rbac/resources	RBAC Resources Route	\N	\N	ADMIN_ACCESS	\N	0	t	\N	2026-01-02 13:20:36.403	2026-01-02 14:01:18.433
nav-documents	navigation	/documents	Documents	Document management	\N	DOCUMENT_VIEW	FileText	2	t	\N	2026-01-02 13:20:36.378	2026-01-02 14:01:18.382
route-admin-rbac-assignments	route	/admin/rbac/assignments	RBAC Assignments Route	\N	\N	ADMIN_ACCESS	\N	0	t	\N	2026-01-02 13:20:36.404	2026-01-02 14:01:18.435
route-admin-organizations	route	/admin/organizations	Organizations Route	\N	\N	ORGANIZATION_MANAGE	\N	0	t	\N	2026-01-02 13:20:36.404	2026-01-02 14:01:18.438
route-admin-audit	route	/admin/audit	Audit Logs Route	\N	\N	AUDIT_VIEW	\N	0	t	\N	2026-01-02 13:20:36.405	2026-01-02 14:01:18.44
route-analytics	route	/analytics	Analytics Route	\N	\N	ANALYTICS_VIEW	\N	0	t	\N	2026-01-02 13:20:36.406	2026-01-02 14:01:18.444
route-profile	route	/profile	Profile Route	\N	\N	\N	\N	0	t	\N	2026-01-02 13:20:36.406	2026-01-02 14:01:18.447
api-documents-list	api	/api/documents	List Documents API	GET /api/documents	\N	DOCUMENT_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.407	2026-01-02 14:01:18.449
api-documents-get	api	/api/documents/:id	Get Document API	GET /api/documents/:id	\N	DOCUMENT_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.408	2026-01-02 14:01:18.453
api-documents-create	api	/api/documents	Create Document API	POST /api/documents	\N	DOCUMENT_CREATE	\N	0	t	{"method": "POST"}	2026-01-02 13:20:36.409	2026-01-02 14:01:18.455
api-documents-update	api	/api/documents/:id	Update Document API	PUT /api/documents/:id	\N	DOCUMENT_EDIT	\N	0	t	{"method": "PUT"}	2026-01-02 13:20:36.41	2026-01-02 14:01:18.458
api-documents-delete	api	/api/documents/:id	Delete Document API	DELETE /api/documents/:id	\N	DOCUMENT_DELETE	\N	0	t	{"method": "DELETE"}	2026-01-02 13:20:36.411	2026-01-02 14:01:18.46
api-documents-approve	api	/api/documents/:id/approve	Approve Document API	POST /api/documents/:id/approve	\N	DOCUMENT_APPROVE	\N	0	t	{"method": "POST"}	2026-01-02 13:20:36.412	2026-01-02 14:01:18.462
api-documents-publish	api	/api/documents/:id/publish	Publish Document API	POST /api/documents/:id/publish	\N	DOCUMENT_PUBLISH	\N	0	t	{"method": "POST"}	2026-01-02 13:20:36.413	2026-01-02 14:01:18.465
api-users-list	api	/api/users	List Users API	GET /api/users	\N	USER_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.414	2026-01-02 14:01:18.468
api-users-get	api	/api/users/:id	Get User API	GET /api/users/:id	\N	USER_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.415	2026-01-02 14:01:18.47
api-users-create	api	/api/users	Create User API	POST /api/users	\N	USER_MANAGE	\N	0	t	{"method": "POST"}	2026-01-02 13:20:36.417	2026-01-02 14:01:18.473
api-users-update	api	/api/users/:id	Update User API	PUT /api/users/:id	\N	USER_MANAGE	\N	0	t	{"method": "PUT"}	2026-01-02 13:20:36.418	2026-01-02 14:01:18.476
api-users-delete	api	/api/users/:id	Delete User API	DELETE /api/users/:id	\N	USER_MANAGE	\N	0	t	{"method": "DELETE"}	2026-01-02 13:20:36.418	2026-01-02 14:01:18.478
api-roles-list	api	/api/roles	List Roles API	GET /api/roles	\N	USER_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.419	2026-01-02 14:01:18.48
api-roles-create	api	/api/roles	Create Role API	POST /api/roles	\N	ROLE_MANAGE	\N	0	t	{"method": "POST"}	2026-01-02 13:20:36.42	2026-01-02 14:01:18.482
api-roles-update	api	/api/roles/:id	Update Role API	PUT /api/roles/:id	\N	ROLE_MANAGE	\N	0	t	{"method": "PUT"}	2026-01-02 13:20:36.421	2026-01-02 14:01:18.485
api-roles-delete	api	/api/roles/:id	Delete Role API	DELETE /api/roles/:id	\N	ROLE_MANAGE	\N	0	t	{"method": "DELETE"}	2026-01-02 13:20:36.421	2026-01-02 14:01:18.487
api-permissions-list	api	/api/permissions	List Permissions API	GET /api/permissions	\N	USER_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.422	2026-01-02 14:01:18.49
api-analytics-dashboard	api	/api/analytics/dashboard	Analytics Dashboard API	GET /api/analytics/dashboard	\N	ANALYTICS_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.424	2026-01-02 14:01:18.495
api-analytics-export	api	/api/analytics/export	Export Analytics API	GET /api/analytics/export	\N	ANALYTICS_EXPORT	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.425	2026-01-02 14:01:18.498
api-audit-logs	api	/api/audit/logs	Audit Logs API	GET /api/audit/logs	\N	AUDIT_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.425	2026-01-02 14:01:18.501
api-organizations-list	api	/api/organizations	List Organizations API	GET /api/organizations	\N	ORGANIZATION_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:20:36.426	2026-01-02 14:01:18.503
api-document-pdf-view	api	/api/documents/:id/pdf	View PDF API	GET /api/documents/:id/pdf - View PDF file	\N	PDF_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:42:54.379	2026-01-02 13:42:54.379
api-document-pdf-download	api	/api/documents/:id/download	Download PDF API	GET /api/documents/:id/download - Download PDF file	\N	PDF_DOWNLOAD	\N	0	t	{"method": "GET"}	2026-01-02 13:42:54.38	2026-01-02 13:42:54.38
api-document-version-pdf	api	/api/documents/:id/version/:version	View PDF Version API	GET /api/documents/:id/version/:version - View specific PDF version	\N	PDF_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:42:54.381	2026-01-02 13:42:54.381
api-document-pdf-print	api	/api/documents/:id/print	Print PDF API	POST /api/documents/:id/print - Generate printable PDF	\N	PDF_PRINT	\N	0	t	{"method": "POST"}	2026-01-02 13:42:54.382	2026-01-02 13:42:54.382
nav-admin-roles	navigation	/admin/roles	Role Management	Manage roles	nav-admin	ROLE_MANAGE	ClipboardCheck	2	t	null	2026-01-02 13:20:36.386	2026-01-07 09:53:04.976
nav-admin-organizations	navigation	/admin/organizations	Organizations	Manage organizational units	nav-admin	ORGANIZATION_MANAGE	Building2	6	t	null	2026-01-02 13:20:36.389	2026-01-07 09:53:37.77
nav-documents-all	navigation	/documents	All Documents	View all documents	nav-documents	DOCUMENT_VIEW	Files	1	t	null	2026-01-02 13:20:36.38	2026-01-07 09:56:20.974
api-document-pdf-watermark	api	/api/documents/:id/watermark	Add Watermark API	POST /api/documents/:id/watermark - Add watermark to PDF	\N	PDF_WATERMARK	\N	0	t	{"method": "POST"}	2026-01-02 13:42:54.383	2026-01-02 13:42:54.383
api-permissions-manage	api	/api/permissions	Manage Permissions API	POST /api/permissions	\N	PERMISSION_MANAGE	\N	0	t	{"method": "POST"}	2026-01-02 13:20:36.423	2026-01-02 14:01:18.493
api-organizations-manage	api	/api/organizations	Manage Organizations API	POST /api/organizations	\N	ORGANIZATION_MANAGE	\N	0	t	{"method": "POST"}	2026-01-02 13:20:36.427	2026-01-02 14:01:18.506
route-document-view	route	/documents/:id/view	Document PDF Viewer Route	View document PDF	\N	PDF_VIEW	\N	0	t	\N	2026-01-02 13:42:54.378	2026-01-02 14:01:18.508
api-document-download	api	/api/documents/:id/download	Download Document API	GET /api/documents/:id/download - Download document file	\N	DOCUMENT_DOWNLOAD	\N	0	t	{"method": "GET"}	2026-01-02 13:44:51.007	2026-01-02 14:01:18.511
api-document-version	api	/api/documents/:id/version/:version	Get Document Version API	GET /api/documents/:id/version/:version - Get specific document version	\N	PDF_VIEW	\N	0	t	{"method": "GET"}	2026-01-02 13:44:51.01	2026-01-02 14:01:18.514
nav-admin-users	navigation	/admin/users	User Management	Manage users	nav-admin	USER_MANAGE	UserCog	1	t	null	2026-01-02 13:20:36.384	2026-01-07 09:51:59.274
nav-admin-audit	navigation	/admin/audit-logs	Audit Logs	View audit logs	nav-admin	AUDIT_VIEW	BrickWall	7	t	null	2026-01-02 13:20:36.39	2026-01-07 09:55:45.343
\.


--
-- Data for Name: role_capabilities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_capabilities (id, name, description, category, created_at, updated_at) FROM stdin;
cmjwvd14s0023k67ye3uv93b7	ANALYTICS_VIEW	View analytics and reports	analytics	2026-01-02 12:47:48.221	2026-01-02 15:36:35.8
cmjwvd14t0024k67y234gdbfv	ANALYTICS_EXPORT	Export analytics data	analytics	2026-01-02 12:47:48.221	2026-01-02 15:36:35.8
cmjwvd14t0025k67yz6b03hqc	AUDIT_VIEW	View audit logs	audit	2026-01-02 12:47:48.222	2026-01-02 15:36:35.8
cmjwvd14u0026k67yajaw7q6x	WORKFLOW_MANAGE	Manage workflow configurations	workflow	2026-01-02 12:47:48.222	2026-01-02 15:36:35.803
cmjwvd14e001gk67y4y65khmy	ADMIN_ACCESS	Full system administration access	system	2026-01-02 12:47:48.206	2026-01-02 15:36:35.782
cmjwvd14g001hk67yuon326nf	SYSTEM_CONFIG	System configuration management	system	2026-01-02 12:47:48.209	2026-01-02 15:36:35.786
cmjwvd14h001ik67y2h0pv81b	USER_MANAGE	Create, update, delete users	user	2026-01-02 12:47:48.209	2026-01-02 15:36:35.786
cmjwvd14h001jk67ysrzcg76c	USER_VIEW	View user information	user	2026-01-02 12:47:48.21	2026-01-02 15:36:35.787
cmjwvd14i001kk67yvho2uomc	ROLE_MANAGE	Manage roles and permissions	user	2026-01-02 12:47:48.21	2026-01-02 15:36:35.788
cmjwvd14j001lk67yg27i4cle	PERMISSION_MANAGE	Manage permissions	user	2026-01-02 12:47:48.211	2026-01-02 15:36:35.789
cmjwvd14j001mk67y3prrr0l3	DOCUMENT_FULL_ACCESS	Full document management access	document	2026-01-02 12:47:48.212	2026-01-02 15:36:35.789
cmjwvd14k001nk67yzlsf01ze	DOCUMENT_VIEW	View documents	document	2026-01-02 12:47:48.212	2026-01-02 15:36:35.791
cmjwvd14l001ok67y3sr3s0k3	DOCUMENT_CREATE	Create new documents	document	2026-01-02 12:47:48.213	2026-01-02 15:36:35.792
cmjwvd14l001pk67y2i89dv4h	DOCUMENT_EDIT	Edit documents	document	2026-01-02 12:47:48.214	2026-01-02 15:36:35.793
cmjwvd14m001qk67ywr6pyvgu	DOCUMENT_DELETE	Delete documents	document	2026-01-02 12:47:48.214	2026-01-02 15:36:35.793
cmjwvd14m001rk67ylvdnybfb	DOCUMENT_APPROVE	Approve documents	document	2026-01-02 12:47:48.215	2026-01-02 15:36:35.794
cmjwvd14n001sk67yycd9lk57	DOCUMENT_PUBLISH	Publish documents	document	2026-01-02 12:47:48.215	2026-01-02 15:36:35.794
cmjwvd14n001tk67y4tewe5qs	DOCUMENT_DOWNLOAD	Download documents	document	2026-01-02 12:47:48.216	2026-01-02 15:36:35.795
cmjwvd14o001uk67y09fyym1z	DOCUMENT_COMMENT	Comment on documents	document	2026-01-02 12:47:48.216	2026-01-02 15:36:35.795
cmjwvd14o001vk67yps7j1g22	DOCUMENT_MANAGE	Full document management (all operations)	document	2026-01-02 12:47:48.217	2026-01-02 15:36:35.795
cmjwvd14p001wk67yawk58kfc	PDF_VIEW	View PDF documents	document	2026-01-02 12:47:48.217	2026-01-02 15:36:35.796
cmjwvd14p001xk67ydsis0nhi	PDF_DOWNLOAD	Download PDF documents	document	2026-01-02 12:47:48.218	2026-01-02 15:36:35.796
cmjwvd14q001yk67youwb9c5f	PDF_PRINT	Print PDF documents	document	2026-01-02 12:47:48.218	2026-01-02 15:36:35.797
cmjwvd14q001zk67yistdd7du	PDF_COPY	Copy content from PDF documents	document	2026-01-02 12:47:48.219	2026-01-02 15:36:35.798
cmjwvd14r0020k67yztrbx1px	PDF_WATERMARK	Control PDF watermark settings	document	2026-01-02 12:47:48.219	2026-01-02 15:36:35.798
cmjwvd14r0021k67yhov2gyee	ORGANIZATION_MANAGE	Manage organizational units (PPD)	organization	2026-01-02 12:47:48.22	2026-01-02 15:36:35.799
cmjwvd14s0022k67yt43e4d79	ORGANIZATION_VIEW	View organizational units	organization	2026-01-02 12:47:48.22	2026-01-02 15:36:35.799
cmk0yhbm70000pc1eenmr2goh	DOCUMENT_SUBMIT_APPROVAL	Submit document for approval	DOCUMENT	2026-01-05 09:26:11.984	2026-01-05 09:26:11.984
\.


--
-- Data for Name: role_capability_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_capability_assignments (role_id, capability_id, assigned_at) FROM stdin;
cmjwvd148001fk67ydeqv6nbd	cmjwvd14e001gk67y4y65khmy	2026-01-02 12:47:48.228
cmjwvd148001fk67ydeqv6nbd	cmjwvd14g001hk67yuon326nf	2026-01-02 12:47:48.231
cmjwvd148001fk67ydeqv6nbd	cmjwvd14h001ik67y2h0pv81b	2026-01-02 12:47:48.233
cmjwvd148001fk67ydeqv6nbd	cmjwvd14h001jk67ysrzcg76c	2026-01-02 12:47:48.235
cmjwvd148001fk67ydeqv6nbd	cmjwvd14i001kk67yvho2uomc	2026-01-02 12:47:48.237
cmjwvd148001fk67ydeqv6nbd	cmjwvd14j001lk67yg27i4cle	2026-01-02 12:47:48.239
cmjwvd148001fk67ydeqv6nbd	cmjwvd14j001mk67y3prrr0l3	2026-01-02 12:47:48.241
cmjwvd148001fk67ydeqv6nbd	cmjwvd14k001nk67yzlsf01ze	2026-01-02 12:47:48.243
cmjwvd148001fk67ydeqv6nbd	cmjwvd14l001ok67y3sr3s0k3	2026-01-02 12:47:48.245
cmjwvd148001fk67ydeqv6nbd	cmjwvd14l001pk67y2i89dv4h	2026-01-02 12:47:48.247
cmjwvd148001fk67ydeqv6nbd	cmjwvd14m001qk67ywr6pyvgu	2026-01-02 12:47:48.249
cmjwvd148001fk67ydeqv6nbd	cmjwvd14m001rk67ylvdnybfb	2026-01-02 12:47:48.251
cmjwvd148001fk67ydeqv6nbd	cmjwvd14n001sk67yycd9lk57	2026-01-02 12:47:48.253
cmjwvd148001fk67ydeqv6nbd	cmjwvd14r0021k67yhov2gyee	2026-01-02 12:47:48.254
cmjwvd148001fk67ydeqv6nbd	cmjwvd14s0023k67ye3uv93b7	2026-01-02 12:47:48.258
cmjwvd148001fk67ydeqv6nbd	cmjwvd14t0024k67y234gdbfv	2026-01-02 12:47:48.26
cmjwvd148001fk67ydeqv6nbd	cmjwvd14t0025k67yz6b03hqc	2026-01-02 12:47:48.262
cmjwvd148001fk67ydeqv6nbd	cmjwvd14u0026k67yajaw7q6x	2026-01-02 12:47:48.264
cmjwvd148001fk67ydeqv6nbd	cmjwvd14s0022k67yt43e4d79	2026-01-02 14:25:06.234
cmjwvd148001fk67ydeqv6nbd	cmjwvd14p001xk67ydsis0nhi	2026-01-03 15:33:55.299
cmjwvd148001fk67ydeqv6nbd	cmjwvd14n001tk67y4tewe5qs	2026-01-03 15:34:15.44
cmjwvd148001dk67y9xz1fu9q	cmjwvd14k001nk67yzlsf01ze	2026-01-03 15:42:33.954
cmjwvd148001dk67y9xz1fu9q	cmjwvd14q001yk67youwb9c5f	2026-01-03 16:02:10.791
cmjwvd148001fk67ydeqv6nbd	cmjwvd14q001yk67youwb9c5f	2026-01-03 16:06:06.607
cmjyj9qtc0002752xjsxv05iv	cmjwvd14p001xk67ydsis0nhi	2026-01-05 07:01:47.046
cmjyj9qtc0002752xjsxv05iv	cmjwvd14o001uk67y09fyym1z	2026-01-05 08:19:36.317
cmjyj9qtc0002752xjsxv05iv	cmjwvd14q001zk67yistdd7du	2026-01-05 08:19:43.089
cmjyj9qtc0002752xjsxv05iv	cmjwvd14q001yk67youwb9c5f	2026-01-05 08:19:44.678
cmjyj9qtc0002752xjsxv05iv	cmjwvd14p001wk67yawk58kfc	2026-01-05 08:19:45.41
cmjyj9qtc0002752xjsxv05iv	cmjwvd14r0020k67yztrbx1px	2026-01-05 08:19:47.24
cmjyj9qtc0002752xjsxv05iv	cmjwvd14j001mk67y3prrr0l3	2026-01-05 08:19:51.754
cmjwvd148001dk67y9xz1fu9q	cmjwvd14n001tk67y4tewe5qs	2026-01-05 08:52:49.367
cmk0xnf420000e0e0kcf86207	cmjwvd14k001nk67yzlsf01ze	2026-01-05 09:31:36.794
cmk0xnf420000e0e0kcf86207	cmjwvd14l001ok67y3sr3s0k3	2026-01-05 09:38:49.385
cmk0xnf420000e0e0kcf86207	cmjwvd14m001qk67ywr6pyvgu	2026-01-05 09:38:54.756
cmk0xnf420000e0e0kcf86207	cmjwvd14n001tk67y4tewe5qs	2026-01-05 09:38:57.703
cmk0xnf420000e0e0kcf86207	cmjwvd14l001pk67y2i89dv4h	2026-01-05 09:38:59.779
cmk0xnf420000e0e0kcf86207	cmjwvd14j001mk67y3prrr0l3	2026-01-05 09:39:02.489
cmk0xnf420000e0e0kcf86207	cmjwvd14o001uk67y09fyym1z	2026-01-05 09:39:17.717
cmk0xnf420000e0e0kcf86207	cmjwvd14n001sk67yycd9lk57	2026-01-05 09:39:31.828
cmk0xnf420000e0e0kcf86207	cmjwvd14q001zk67yistdd7du	2026-01-05 09:39:35.105
cmk0xnf420000e0e0kcf86207	cmjwvd14p001xk67ydsis0nhi	2026-01-05 09:39:36.511
cmk0xnf420000e0e0kcf86207	cmjwvd14q001yk67youwb9c5f	2026-01-05 09:39:38.802
cmk0xnf420000e0e0kcf86207	cmjwvd14p001wk67yawk58kfc	2026-01-05 09:39:40.691
cmk0xnf420000e0e0kcf86207	cmjwvd14r0020k67yztrbx1px	2026-01-05 09:39:43.188
cmk0xnf420000e0e0kcf86207	cmk0yhbm70000pc1eenmr2goh	2026-01-05 09:55:54.208
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14m001rk67ylvdnybfb	2026-01-06 02:49:27.64
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14o001uk67y09fyym1z	2026-01-06 02:51:41.38
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14l001ok67y3sr3s0k3	2026-01-06 02:51:43.23
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14m001qk67ywr6pyvgu	2026-01-06 02:51:45.342
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14n001tk67y4tewe5qs	2026-01-06 02:51:47.427
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14l001pk67y2i89dv4h	2026-01-06 02:51:49.751
cmjyj9qtc0002752xjsxv05iv	cmjwvd14k001nk67yzlsf01ze	2026-01-05 03:28:08.585
cmjyj9qtc0002752xjsxv05iv	cmjwvd14n001tk67y4tewe5qs	2026-01-05 03:30:23.246
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14j001mk67y3prrr0l3	2026-01-06 02:51:52.001
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14n001sk67yycd9lk57	2026-01-06 02:51:54.457
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14k001nk67yzlsf01ze	2026-01-06 02:51:56.141
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14q001zk67yistdd7du	2026-01-06 02:51:58.032
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14p001xk67ydsis0nhi	2026-01-06 02:51:59.814
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14q001yk67youwb9c5f	2026-01-06 02:52:09.059
cmk0hebmf0004j4k50pigl56k	cmjwvd14l001ok67y3sr3s0k3	2026-01-05 04:17:44.861
cmk0hebmf0004j4k50pigl56k	cmjwvd14k001nk67yzlsf01ze	2026-01-05 04:19:44.845
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14p001wk67yawk58kfc	2026-01-06 02:52:11.352
cmk0hebmf0004j4k50pigl56k	cmjwvd14n001tk67y4tewe5qs	2026-01-05 04:23:23.208
cmk1zpj8w000cak4n2ht5csm9	cmjwvd14r0020k67yztrbx1px	2026-01-06 02:52:13.09
cmjyj9qtc0002752xjsxv05iv	cmjwvd14l001ok67y3sr3s0k3	2026-01-05 04:32:21.065
cmjyj9qtc0002752xjsxv05iv	cmjwvd14l001pk67y2i89dv4h	2026-01-05 04:34:02.42
cmjyj9qtc0002752xjsxv05iv	cmjwvd14m001qk67ywr6pyvgu	2026-01-05 04:35:17.279
cmjyj9qtc0002752xjsxv05iv	cmjwvd14n001sk67yycd9lk57	2026-01-05 04:52:45.854
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, role_id, permission_id, is_granted, source, created_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, display_name, description, is_active, is_system, created_at, updated_at) FROM stdin;
cmjwvd148001fk67ydeqv6nbd	admin	Administrator	Full system access	t	t	2026-01-02 12:47:48.2	2026-01-02 12:47:48.2
cmjyj9qtc0002752xjsxv05iv	ppd.pusat	ppd pusat	Melakukan pengecekan dokumen draft dari ppd unit sebelum masuk ke tahap review bersama (DRAFT -> PENDING_REVIEW)	t	f	2026-01-03 16:44:51.84	2026-01-04 13:51:43.271
cmjwvd148001dk67y9xz1fu9q	viewer	Viewer	Can only view documents	t	f	2026-01-02 12:47:48.2	2026-01-03 16:48:34.167
cmk0hebmf0004j4k50pigl56k	ppd.unit	ppd unit	Petugas Pengendali Dokumen Unit Kerja	t	f	2026-01-05 01:27:58.551	2026-01-05 01:27:58.551
cmk0xnf420000e0e0kcf86207	asisten.manager.pksm	Asisten Manager PKSM	Role khusus untuk approve/reject dokumen saja	t	f	2026-01-05 09:02:56.834	2026-01-05 09:02:56.834
cmjwvd148001ek67yzbswffml	manager pksm	Manager PKSM	Can create and edit documents	t	f	2026-01-02 12:47:48.2	2026-01-06 02:46:40.961
cmk1zpj8w000cak4n2ht5csm9	kadiv pksm	Kepala Divisi PKSM	Pimpinan tertinggi di Divisi Pengendalian Kinerja Sistem Manajemen	t	f	2026-01-06 02:48:20.913	2026-01-06 02:48:20.913
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, session_token, user_id, expires, ip_address, user_agent, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_config (id, key, value, data_type, category, description, is_editable, created_at, updated_at) FROM stdin;
cmjwvd1410018k67y3himvevc	app_name	Document Management System	string	application	Application name displayed in the interface	t	2026-01-02 12:47:48.193	2026-01-02 12:47:48.193
cmjwvd141001ck67y4h2ft217	enable_notifications	true	boolean	features	Enable real-time notifications	t	2026-01-02 12:47:48.193	2026-01-02 12:47:48.193
cmjwvd141001bk67yme5jyt2q	session_timeout	86400	number	security	Session timeout in seconds	t	2026-01-02 12:47:48.193	2026-01-02 12:47:48.193
cmjwvd1410019k67ycyggpp5r	max_file_size	52428800	number	upload	Maximum file size for uploads in bytes	t	2026-01-02 12:47:48.193	2026-01-02 12:47:48.193
cmjwvd141001ak67ytudc407v	allowed_file_types	pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png	string	upload	Allowed file extensions for uploads	t	2026-01-02 12:47:48.193	2026-01-02 12:47:48.193
\.


--
-- Data for Name: system_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_logs (id, user_id, action, entity, entity_id, description, ip_address, user_agent, metadata, created_at) FROM stdin;
cmknbkaqv0001akwwmvvt2x0s	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	PIR	Search query: "PIR" (2 results)	\N	\N	{"query": "PIR", "timestamp": "2026-01-21T01:03:21.701Z", "resultsCount": 2}	2026-01-21 01:03:21.702
cmkulfs5f0001akhpmva9qguq	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Post	Search query: "Post" (3 results)	\N	\N	{"query": "Post", "timestamp": "2026-01-26T03:14:10.370Z", "resultsCount": 3}	2026-01-26 03:14:10.37
cmkulgi4x0003akhpzx3108qw	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	PIR	Search query: "PIR" (2 results)	\N	\N	{"query": "PIR", "timestamp": "2026-01-26T03:14:44.047Z", "resultsCount": 2}	2026-01-26 03:14:44.048
cmkulgv8y0005akhpf01ip2k2	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	dokumen	Search query: "dokumen" (11 results)	\N	\N	{"query": "dokumen", "timestamp": "2026-01-26T03:15:01.042Z", "resultsCount": 11}	2026-01-26 03:15:01.042
cmkum0rjh0009akhp3ra5t5bm	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	implementasi	Search query: "implementasi" (3 results)	\N	\N	{"query": "implementasi", "timestamp": "2026-01-26T03:30:29.355Z", "resultsCount": 3}	2026-01-26 03:30:29.356
cmkum25fu000bakhpyuyefrjs	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Implementasi	Search query: "Implementasi" (3 results)	\N	\N	{"query": "Implementasi", "timestamp": "2026-01-26T03:31:34.024Z", "resultsCount": 3}	2026-01-26 03:31:34.025
cmkum2wu4000dakhpy6w4rpye	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	PLTA	Search query: "PLTA" (1 results)	\N	\N	{"query": "PLTA", "timestamp": "2026-01-26T03:32:09.531Z", "resultsCount": 1}	2026-01-26 03:32:09.532
cmkumcw8g000fakhpzvcm5xzs	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	listrik	Search query: "listrik" (13 results)	\N	\N	{"query": "listrik", "timestamp": "2026-01-26T03:39:55.311Z", "resultsCount": 13}	2026-01-26 03:39:55.312
cmkun9sor000lakhprlt825yg	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	BJPSDA	Search query: "BJPSDA" (1 results)	\N	\N	{"query": "BJPSDA", "timestamp": "2026-01-26T04:05:30.362Z", "resultsCount": 1}	2026-01-26 04:05:30.362
cmkupeekx0001ak0debc241zh	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	listrik	Search query: "listrik" (13 results)	\N	\N	{"query": "listrik", "timestamp": "2026-01-26T05:05:04.592Z", "resultsCount": 13}	2026-01-26 05:05:04.592
cmkupj0410005ak0dbwy1vo0q	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	listrik	Search query: "listrik" (13 results)	\N	\N	{"query": "listrik", "timestamp": "2026-01-26T05:08:39.120Z", "resultsCount": 13}	2026-01-26 05:08:39.121
cmkupjaph0007ak0dgklt9bet	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	listrik	Search query: "listrik" (13 results)	\N	\N	{"query": "listrik", "timestamp": "2026-01-26T05:08:52.853Z", "resultsCount": 13}	2026-01-26 05:08:52.853
cmkupjnsu0009ak0d5420m6da	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	PIR	Search query: "PIR" (2 results)	\N	\N	{"query": "PIR", "timestamp": "2026-01-26T05:09:09.822Z", "resultsCount": 2}	2026-01-26 05:09:09.823
cmkupmnk8000dak0dhqrzq97b	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	PIR	Search query: "PIR" (2 results)	\N	\N	{"query": "PIR", "timestamp": "2026-01-26T05:11:29.480Z", "resultsCount": 2}	2026-01-26 05:11:29.481
cmkupqffu000lak0dpzr1bpkx	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	implementation	Search query: "implementation" (2 results)	\N	\N	{"query": "implementation", "timestamp": "2026-01-26T05:14:25.578Z", "resultsCount": 2}	2026-01-26 05:14:25.579
cmkuprehr000nak0dnpdcefqx	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	implementation	Search query: "implementation" (2 results)	\N	\N	{"query": "implementation", "timestamp": "2026-01-26T05:15:11.007Z", "resultsCount": 2}	2026-01-26 05:15:11.008
cmkupshr3000pak0d3b9vh5f1	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	sertifikat	Search query: "sertifikat" (1 results)	\N	\N	{"query": "sertifikat", "timestamp": "2026-01-26T05:16:01.886Z", "resultsCount": 1}	2026-01-26 05:16:01.887
cmkupzb36000tak0d4sz3p6km	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Aplikasi	Search query: "Aplikasi" (2 results)	\N	\N	{"query": "Aplikasi", "timestamp": "2026-01-26T05:21:19.841Z", "resultsCount": 2}	2026-01-26 05:21:19.841
cmltpgjc20003akmsnw8vcqpo	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	risiko	Search query: "risiko" (2 results)	\N	\N	{"query": "risiko", "timestamp": "2026-02-19T16:58:40.225Z", "resultsCount": 2}	2026-02-19 16:58:40.226
cmltpoerm0005akms0vbe02xo	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Prosedur Post Implementation Review	Search query: "Prosedur Post Implementation Review" (1 results)	\N	\N	{"query": "Prosedur Post Implementation Review", "timestamp": "2026-02-19T17:04:47.552Z", "resultsCount": 1}	2026-02-19 17:04:47.554
cmltpps3r0007akmsb8z1vt3w	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Prosedur Post Implementation Review	Search query: "Prosedur Post Implementation Review" (1 results)	\N	\N	{"query": "Prosedur Post Implementation Review", "timestamp": "2026-02-19T17:05:51.495Z", "resultsCount": 1}	2026-02-19 17:05:51.496
cmlv1m88t0003akpugdfq6nqo	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Prosedur Rencana Pemulihan Bencana TI (IT Disaster Recovery Plan)	Search query: "Prosedur Rencana Pemulihan Bencana TI (IT Disaster Recovery Plan)" (1 results)	\N	\N	{"query": "Prosedur Rencana Pemulihan Bencana TI (IT Disaster Recovery Plan)", "timestamp": "2026-02-20T15:26:47.356Z", "resultsCount": 1}	2026-02-20 15:26:47.356
cmlv1mg8m0005akpu93e4wf6m	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	disaster	Search query: "disaster" (1 results)	\N	\N	{"query": "disaster", "timestamp": "2026-02-20T15:26:57.718Z", "resultsCount": 1}	2026-02-20 15:26:57.718
cmlv1mkpn0007akpu2hekjomc	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	prosedur	Search query: "prosedur" (20 results)	\N	\N	{"query": "prosedur", "timestamp": "2026-02-20T15:27:03.514Z", "resultsCount": 20}	2026-02-20 15:27:03.515
cmlv3064u0001akaxv8cwjukm	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	prosedur	Search query: "prosedur" (20 results)	\N	\N	{"query": "prosedur", "timestamp": "2026-02-20T16:05:37.421Z", "resultsCount": 20}	2026-02-20 16:05:37.422
cmlv30eg60003akaxon7cyhjg	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Post	Search query: "Post" (3 results)	\N	\N	{"query": "Post", "timestamp": "2026-02-20T16:05:48.197Z", "resultsCount": 3}	2026-02-20 16:05:48.198
cmlv3155r0005akaxx7zqn9y9	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Dokumen	Search query: "Dokumen" (11 results)	\N	\N	{"query": "Dokumen", "timestamp": "2026-02-20T16:06:22.815Z", "resultsCount": 11}	2026-02-20 16:06:22.816
cmlv3c1c00007akaxhn37dlcp	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Dokumen	Search query: "Dokumen" (11 results)	\N	\N	{"query": "Dokumen", "timestamp": "2026-02-20T16:14:51.071Z", "resultsCount": 11}	2026-02-20 16:14:51.072
cmlv3cabc0009akaxhp2a9ful	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Dokumen	Search query: "Dokumen" (11 results)	\N	\N	{"query": "Dokumen", "timestamp": "2026-02-20T16:15:02.712Z", "resultsCount": 11}	2026-02-20 16:15:02.713
cmlv3i3x10001akwyqwr0yw32	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	dokumen	Search query: "dokumen" (11 results)	\N	\N	{"query": "dokumen", "timestamp": "2026-02-20T16:19:34.356Z", "resultsCount": 11}	2026-02-20 16:19:34.357
cmlv3pw8w0003akwyqoo1w85h	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	dokumen	Search query: "dokumen" (11 results)	\N	\N	{"query": "dokumen", "timestamp": "2026-02-20T16:25:37.664Z", "resultsCount": 11}	2026-02-20 16:25:37.664
cmlv3v72u0005akwyz8njm25j	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	dokumen	Search query: "dokumen" (11 results)	\N	\N	{"query": "dokumen", "timestamp": "2026-02-20T16:29:44.982Z", "resultsCount": 11}	2026-02-20 16:29:44.983
cmlv3wpob0007akwyjklpvbac	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	manajemen	Search query: "manajemen" (20 results)	\N	\N	{"query": "manajemen", "timestamp": "2026-02-20T16:30:55.738Z", "resultsCount": 20}	2026-02-20 16:30:55.739
cmlv3zjui0009akwygl8o1pr5	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	Prosedur Manajemen Inovasi TI	Search query: "Prosedur Manajemen Inovasi TI" (1 results)	\N	\N	{"query": "Prosedur Manajemen Inovasi TI", "timestamp": "2026-02-20T16:33:08.153Z", "resultsCount": 1}	2026-02-20 16:33:08.154
cmlv4cvds000bakwyv22wjhka	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	instruksi	Search query: "instruksi" (3 results)	\N	\N	{"query": "instruksi", "timestamp": "2026-02-20T16:43:29.630Z", "resultsCount": 3}	2026-02-20 16:43:29.631
cmlv4rrjd0001ak0urs33dgcs	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	dokumen	Search query: "dokumen" (11 results)	\N	\N	{"query": "dokumen", "timestamp": "2026-02-20T16:55:04.488Z", "resultsCount": 11}	2026-02-20 16:55:04.489
cmlv51i3h0003ak0uc8n3yvcc	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	dokumen	Search query: "dokumen" (11 results)	\N	\N	{"query": "dokumen", "timestamp": "2026-02-20T17:02:38.813Z", "resultsCount": 11}	2026-02-20 17:02:38.813
cmlv53r010007ak0uiek8oytu	cmjwvczk6000tk67yqfzvu89w	VIEW	SEARCH	dokumen	Search query: "dokumen" (11 results)	\N	\N	{"query": "dokumen", "timestamp": "2026-02-20T17:04:23.664Z", "resultsCount": 11}	2026-02-20 17:04:23.665
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (id, user_id, role_id, assigned_by, assigned_at, expires_at, is_active, is_manually_assigned) FROM stdin;
cmjww875c002czzoprgrflltv	cmjwvd13i000yk67ysjtjp81d	cmjwvd148001ek67yzbswffml	cmjwvczk6000tk67yqfzvu89w	2026-01-02 13:12:02.352	\N	t	f
cmjww875c002gzzopg77vjiqd	cmjwvd13i0010k67y71yvz49n	cmjwvd148001dk67y9xz1fu9q	cmjwvczk6000tk67yqfzvu89w	2026-01-02 13:12:02.352	\N	t	f
cmjww875c0029zzopfeiq5jpd	cmjwvczk6000tk67yqfzvu89w	cmjwvd148001fk67ydeqv6nbd	cmjwvczk6000tk67yqfzvu89w	2026-01-02 13:12:02.352	\N	t	f
cmjww875c002lzzopfl2gsl7k	cmjwvd13i0016k67yomlhj23c	cmjwvd148001dk67y9xz1fu9q	cmjwvczk6000tk67yqfzvu89w	2026-01-02 13:12:02.353	\N	t	f
cmjyjhq4n0003483atwl2je15	cmjwvd13i0015k67y5qg7w2qq	cmjyj9qtc0002752xjsxv05iv	cmjwvczk6000tk67yqfzvu89w	2026-01-03 16:51:04.2	\N	t	f
cmk0hfv5r0006j4k5w46icja5	cmjwvd13i0017k67yccjxnpiz	cmk0hebmf0004j4k50pigl56k	cmjwvczk6000tk67yqfzvu89w	2026-01-05 01:29:10.527	\N	t	f
cmk0ypa140003uqgdwsj41zvd	cmjwvd13i0011k67yhnsrcfug	cmk0xnf420000e0e0kcf86207	cmjwvczk6000tk67yqfzvu89w	2026-01-05 09:32:23.176	\N	t	f
cmk1zpwfd000eak4nj429kq1e	cmjwvd13i000zk67y38y267mg	cmk1zpj8w000cak4n2ht5csm9	cmjwvczk6000tk67yqfzvu89w	2026-01-06 02:48:37.993	\N	t	f
cmk3gc55j000iak71xe5ef7re	cmk3gc55i000gak71a49tauon	cmjwvd148001dk67y9xz1fu9q	cmjwvczk6000tk67yqfzvu89w	2026-01-07 03:21:35.765	\N	t	f
cmk3gsve3000zak71uvnuefv6	cmk3gsve3000xak71yb0k54eu	cmjwvd148001dk67y9xz1fu9q	cmjwvczk6000tk67yqfzvu89w	2026-01-07 03:34:36.266	\N	t	f
cmk3gx69b0014ak71ds29l14n	cmk3gx69b0012ak71flm5zwyq	cmjwvd148001dk67y9xz1fu9q	cmjwvczk6000tk67yqfzvu89w	2026-01-07 03:37:56.974	\N	t	f
cmk3hqtxs002rak71mgii5yfa	cmk3h9wjo001nak71q3mgd3bb	cmk0hebmf0004j4k50pigl56k	cmjwvczk6000tk67yqfzvu89w	2026-01-07 04:01:00.688	\N	t	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password_hash, first_name, last_name, is_active, created_at, updated_at, group_id, divisi_id, department, email_verified_at, last_login_at, phone, "position", external_id, external_source, is_external, last_sync_at, metadata, must_change_password) FROM stdin;
cmjwvd13i0010k67y71yvz49n	operations_user	operations@dsm.com	$2a$12$VuZ9m2x0dGn0cIDqdI.yQu0T8Ly.k/SbNMK07sMjloo7S2GV7VsiS	Operations	Staff	t	2026-01-02 12:47:48.174	2026-01-02 12:47:48.174	cmjwvczau000ek67yvmqt5flw	cmjwvczbk000pk67y6oi5p0qc	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmjwvczk6000tk67yqfzvu89w	admin	admin@dsm.com	$2a$12$I6DNCTbyieRpc5eUbRaacOzdKpI779cKNlcMPk8728vG.R46L4Fhm	System	Administrator	t	2026-01-02 12:47:46.182	2026-01-02 12:47:46.182	cmjwvczas0007k67yscjh1kf2	cmjwvczbk000nk67yxs80w76o	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmjwvd13i0015k67y5qg7w2qq	ppd.pusat	ppd.pusat@dsm.com	$2a$10$Z1RdwdevPhsrMr9DUgVTM.RsJJPng/rbTqOuF.8Y.SxpK060J5KpS	Khalid	-	t	2026-01-02 12:47:48.174	2026-01-04 15:03:56.103	\N	cmjwvczbk000pk67y6oi5p0qc	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmjwvd13i0017k67yccjxnpiz	tik_user	tik@dsm.com	$2a$10$zXgkDhmpHqfq1ZwB49rIueGDFAIHstvANgvZrHqxBl2VwXAYPDeQ2	TIK	Staff	t	2026-01-02 12:47:48.174	2026-01-05 01:29:56.946	cmjwvczat0008k67yul5jkqdv	cmjwvczbk000nk67yxs80w76o	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmjwvd13i0011k67yhnsrcfug	043410176	043410176@dsm.com	$2a$10$kxrFrjfv54ZMQJVuQWKkD.jC3MnLPOQqRvT09OuL0OihY1TBrGUee	Fanny	-	t	2026-01-02 12:47:48.174	2026-01-05 09:36:50.076	\N	cmjwvczbk000nk67yxs80w76o	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmjwvd13i000zk67y38y267mg	kadiv	kadiv@dsm.com	$2a$10$5Pl5v.7760sV3fgn/4GtbuWrGrlkVXQVUSDQtSK3ccB9ujALG1OPi	Kepala	Divisi	t	2026-01-02 12:47:48.174	2026-01-06 02:53:07.941	\N	cmjwvczbk000qk67yq9pu8lhz	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmjwvd13i000yk67ysjtjp81d	manager_user	manager@dsm.com	$2a$10$9ybSJoO91nX0kLTpK3ZN7.WjDpkD1cnz5GuAFW7UDsFdWyNjqXrdS	Manager	User	t	2026-01-02 12:47:48.174	2026-01-06 07:03:04.282	\N	cmjwvczbk000ok67yshww86ov	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmk3h9wjo001nak71q3mgd3bb	PWT2972500	annisa.ramadhanty@jasatirta2.co.id	$2a$12$zq6Z9yI5o1ucfqOTtJacXOyl2.Dl.P5/l2dleVvVcCupByrJqr8qq	ANNISA	RAMADHANTY, S. I. Kom	t	2026-01-07 03:47:50.915	2026-01-07 04:04:01.809	cmjwvczau000fk67yx9qjt75q	\N	\N	\N	2026-01-07 04:04:01.809	\N	\N	PWT2972500	SIKAWAN	t	2026-01-07 04:04:01.514	{"jabatan": "Petugas Humas TK II", "id_jabatan": "162", "unit_kerja": "Kantor Pusat", "nama_bidang": "Bidang Hubungan Masyarakat", "id_unitkerja": "1", "nama_subbidang": "Sub Bidang Hubungan Masyarakat"}	f
cmjwvd13i0016k67yomlhj23c	047171189	puas@dsm.com	$2a$10$SjDA5OT5wz/gJUcNk/HYbO83SdL2xc6anNPhW7FVkyZQmYHy8i9pi	Puas	Apriyampon	t	2026-01-02 12:47:48.174	2026-01-07 04:06:00.966	cmjwvczat000ak67y2dt5oyx6	cmjwvczbk000ok67yshww86ov	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f
cmk3gc55i000gak71a49tauon	050361982	wawan.suharwan@jasatirta2.co.id	$2a$12$BVWNyCOO.oJ.9MdZJKOO9OeGsGyDk3d8TBJccd9.EGodTEsBQOSs2	WAWAN	SUHARWAN	t	2026-01-07 03:21:35.765	2026-01-07 04:24:13.454	\N	\N	\N	\N	2026-01-07 04:24:13.454	\N	\N	050361982	SIKAWAN	f	2026-01-07 04:24:13.147	{"jabatan": "Staff I", "id_jabatan": "381", "unit_kerja": "Unit Wilayah III", "nama_bidang": "Seksi Unit Wilayah III", "id_unitkerja": "13", "nama_subbidang": "Seksi Binong"}	f
cmk3gsve3000xak71yb0k54eu	PWT2992500	agung.satria@jasatirta2.co.id	$2a$12$bVluLoLbMQySB2yY3SII7O6qc4QbNU7ZpSAqC7s2rTMdAOvRvRLyC	AGUNG	SATRIA HARYONO	t	2026-01-07 03:34:36.266	2026-01-07 03:47:21.462	\N	\N	\N	\N	2026-01-07 03:44:37.86	\N	\N	PWT2992500	SIKAWAN	f	2026-01-07 03:44:37.574	{"jabatan": "Videografer", "id_jabatan": "401", "unit_kerja": "Kantor Pusat", "nama_bidang": "Bidang Komunikasi Perusahaan", "id_unitkerja": "1", "nama_subbidang": null}	t
cmk3gx69b0012ak71flm5zwyq	052772598	novia.anggun@jasatirta2.co.id	$2a$12$KrXfpcSb9Id/7RPaUPof/O4yjIv3LmYiQw9McVNNfzLTnvSH36XJa	RA	NOVIA ANGGUN WULAN, S. AP.	t	2026-01-07 03:37:56.974	2026-01-07 03:47:21.462	\N	\N	\N	\N	2026-01-07 03:38:27.306	\N	\N	052772598	SIKAWAN	f	2026-01-07 03:38:27.025	{"jabatan": "Officer II", "id_jabatan": "380", "unit_kerja": "Kantor Pusat", "nama_bidang": "Bidang Kesekretariatan", "id_unitkerja": "1", "nama_subbidang": "Sub Bidang Administrasi Perusahaan"}	t
\.


--
-- Data for Name: workflow_transitions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workflow_transitions (id, from_status, to_status, min_level, required_permission, description, allowed_by_label, is_active, sort_order, created_at, updated_at) FROM stdin;
cmjy7vf21000813rm0kt1mckl	IN_REVIEW	ARCHIVED	100	documents.delete	Archive document	Administrator	t	9	2026-01-03 11:25:47.641	2026-01-20 06:20:42.07
cmjy7vf22000913rmtsr36rzo	PENDING_APPROVAL	ARCHIVED	100	documents.delete	Archive document	Administrator	t	10	2026-01-03 11:25:47.642	2026-01-20 06:20:42.071
cmjy7vf23000a13rmslp1sjik	APPROVED	ARCHIVED	100	documents.delete	Archive document	Administrator	t	11	2026-01-03 11:25:47.643	2026-01-20 06:20:42.072
cmjy7vf23000b13rms1lqlmwv	PUBLISHED	ARCHIVED	100	documents.delete	Archive document	Administrator	t	12	2026-01-03 11:25:47.644	2026-01-20 06:20:42.073
cmjy7vf24000c13rmyn4e19g0	REJECTED	ARCHIVED	100	documents.delete	Archive document	Administrator	t	13	2026-01-03 11:25:47.645	2026-01-20 06:20:42.074
cmjy7vf25000d13rmixhf9lko	PUBLISHED	EXPIRED	100	documents.update	Mark published document as expired	Administrator	t	14	2026-01-03 11:25:47.646	2026-01-20 06:20:42.075
cmkm7gjq3000eak9o8l085fau	PUBLISHED	IN_REVIEW	90	DOCUMENT_PUBLISH,DOCUMENT_EDIT	Start document revision (new version)	PPD, Administrator	t	15	2026-01-20 06:20:42.076	2026-01-20 06:20:42.076
cmjy7vf26000e13rmnh0vf9sm	ARCHIVED	DRAFT	100	documents.update	Unarchive document	Administrator	t	16	2026-01-03 11:25:47.647	2026-01-20 06:20:42.077
cmjy7vf1t000113rm03pc7up2	IN_REVIEW	PENDING_APPROVAL	70	DOCUMENT_SUBMIT_APPROVAL	Submit for approval	Submitters	t	2	2026-01-03 11:25:47.633	2026-01-05 09:26:18.581
cmjy7vf1a000013rm43eityul	DRAFT	IN_REVIEW	50	documents.update	Submit document for review	Editor, Manager, Administrator	t	1	2026-01-03 11:25:47.612	2026-01-20 06:20:42.042
cmkm7gjpo0001ak9oh4w0yl0e	PENDING_REVIEW	PENDING_APPROVAL	70	documents.update	Review completed, forward for approval	Manager, Administrator	t	2	2026-01-20 06:20:42.06	2026-01-20 06:20:42.06
cmjy7vf1u000213rm5sarande	IN_REVIEW	DRAFT	70	documents.update	Send back for revision	Manager, Administrator	t	3	2026-01-03 11:25:47.635	2026-01-20 06:20:42.062
cmjy7vf1v000313rm4mw70im3	PENDING_APPROVAL	APPROVED	70	documents.approve	Approve document	Manager, Administrator	t	4	2026-01-03 11:25:47.636	2026-01-20 06:20:42.063
cmjy7vf1w000413rmzbdj6kux	PENDING_APPROVAL	REJECTED	70	documents.approve	Reject document	Manager, Administrator	t	5	2026-01-03 11:25:47.637	2026-01-20 06:20:42.065
cmjy7vf1x000513rm2yxgh5gp	APPROVED	PUBLISHED	100	documents.publish	Publish approved document	Administrator	t	6	2026-01-03 11:25:47.637	2026-01-20 06:20:42.066
cmjy7vf1y000613rmt92jt2f1	REJECTED	DRAFT	50	documents.update	Return to draft for revision after rejection	Editor, Manager, Administrator	t	7	2026-01-03 11:25:47.638	2026-01-20 06:20:42.067
cmjy7vf1z000713rmtqlhgb6k	DRAFT	ARCHIVED	100	documents.delete	Archive document	Administrator	t	8	2026-01-03 11:25:47.639	2026-01-20 06:20:42.069
\.


--
-- Name: _GroupToMenu _GroupToMenu_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_GroupToMenu"
    ADD CONSTRAINT "_GroupToMenu_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: divisi divisi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisi
    ADD CONSTRAINT divisi_pkey PRIMARY KEY (id);


--
-- Name: document_activities document_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_activities
    ADD CONSTRAINT document_activities_pkey PRIMARY KEY (id);


--
-- Name: document_history document_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_history
    ADD CONSTRAINT document_history_pkey PRIMARY KEY (id);


--
-- Name: document_relations document_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_pkey PRIMARY KEY (id);


--
-- Name: document_search_scores document_search_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_search_scores
    ADD CONSTRAINT document_search_scores_pkey PRIMARY KEY (document_id);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents_type documents_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents_type
    ADD CONSTRAINT documents_type_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: menu menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: ppd ppd_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppd
    ADD CONSTRAINT ppd_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: role_capabilities role_capabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_capabilities
    ADD CONSTRAINT role_capabilities_pkey PRIMARY KEY (id);


--
-- Name: role_capability_assignments role_capability_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_capability_assignments
    ADD CONSTRAINT role_capability_assignments_pkey PRIMARY KEY (role_id, capability_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workflow_transitions workflow_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT workflow_transitions_pkey PRIMARY KEY (id);


--
-- Name: _GroupToMenu_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_GroupToMenu_B_index" ON public."_GroupToMenu" USING btree ("B");


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_actor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs USING btree (actor_id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_resource_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_resource_id_idx ON public.audit_logs USING btree (resource_id);


--
-- Name: audit_logs_resource_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_resource_idx ON public.audit_logs USING btree (resource);


--
-- Name: comments_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_created_at_idx ON public.comments USING btree (created_at);


--
-- Name: comments_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_document_id_idx ON public.comments USING btree (document_id);


--
-- Name: comments_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_parent_id_idx ON public.comments USING btree (parent_id);


--
-- Name: comments_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_user_id_idx ON public.comments USING btree (user_id);


--
-- Name: divisi_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX divisi_code_key ON public.divisi USING btree (code);


--
-- Name: document_activities_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_activities_action_idx ON public.document_activities USING btree (action);


--
-- Name: document_activities_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_activities_created_at_idx ON public.document_activities USING btree (created_at);


--
-- Name: document_activities_document_id_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_activities_document_id_action_idx ON public.document_activities USING btree (document_id, action);


--
-- Name: document_activities_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_activities_document_id_idx ON public.document_activities USING btree (document_id);


--
-- Name: document_activities_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_activities_user_id_idx ON public.document_activities USING btree (user_id);


--
-- Name: document_history_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_history_action_idx ON public.document_history USING btree (action);


--
-- Name: document_history_changed_by_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_history_changed_by_id_idx ON public.document_history USING btree (changed_by_id);


--
-- Name: document_history_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_history_created_at_idx ON public.document_history USING btree (created_at);


--
-- Name: document_history_document_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_history_document_id_created_at_idx ON public.document_history USING btree (document_id, created_at);


--
-- Name: document_history_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_history_document_id_idx ON public.document_history USING btree (document_id);


--
-- Name: document_relations_child_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_relations_child_id_idx ON public.document_relations USING btree (child_id);


--
-- Name: document_relations_parent_id_child_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX document_relations_parent_id_child_id_key ON public.document_relations USING btree (parent_id, child_id);


--
-- Name: document_relations_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_relations_parent_id_idx ON public.document_relations USING btree (parent_id);


--
-- Name: document_relations_relation_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_relations_relation_type_idx ON public.document_relations USING btree (relation_type);


--
-- Name: document_versions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_versions_created_at_idx ON public.document_versions USING btree (created_at);


--
-- Name: document_versions_created_by_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_versions_created_by_id_idx ON public.document_versions USING btree (created_by_id);


--
-- Name: document_versions_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_versions_document_id_idx ON public.document_versions USING btree (document_id);


--
-- Name: document_versions_document_id_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX document_versions_document_id_version_key ON public.document_versions USING btree (document_id, version);


--
-- Name: document_versions_parent_version_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_versions_parent_version_id_idx ON public.document_versions USING btree (parent_version_id);


--
-- Name: documents_approved_by_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_approved_by_id_idx ON public.documents USING btree (approved_by_id);


--
-- Name: documents_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_created_at_idx ON public.documents USING btree (created_at);


--
-- Name: documents_created_by_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_created_by_id_idx ON public.documents USING btree (created_by_id);


--
-- Name: documents_created_by_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_created_by_id_status_idx ON public.documents USING btree (created_by_id, status);


--
-- Name: documents_document_type_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_document_type_id_idx ON public.documents USING btree (document_type_id);


--
-- Name: documents_document_type_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_document_type_id_status_idx ON public.documents USING btree (document_type_id, status);


--
-- Name: documents_extraction_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_extraction_status_idx ON public.documents USING btree (extraction_status);


--
-- Name: documents_hierarchy_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_hierarchy_level_idx ON public.documents USING btree (hierarchy_level);


--
-- Name: documents_hierarchy_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_hierarchy_path_idx ON public.documents USING btree (hierarchy_path);


--
-- Name: documents_parent_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_parent_document_id_idx ON public.documents USING btree (parent_document_id);


--
-- Name: documents_sort_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_sort_order_idx ON public.documents USING btree (sort_order);


--
-- Name: documents_status_document_type_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_status_document_type_id_created_at_idx ON public.documents USING btree (status, document_type_id, created_at DESC);


--
-- Name: documents_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_status_idx ON public.documents USING btree (status);


--
-- Name: documents_type_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX documents_type_slug_key ON public.documents_type USING btree (slug);


--
-- Name: documents_updated_by_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_updated_by_id_idx ON public.documents USING btree (updated_by_id);


--
-- Name: groups_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX groups_is_active_idx ON public.groups USING btree (is_active);


--
-- Name: groups_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX groups_name_key ON public.groups USING btree (name);


--
-- Name: idx_document_search_scores_popularity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_search_scores_popularity ON public.document_search_scores USING btree (popularity_score DESC);


--
-- Name: idx_document_search_scores_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_search_scores_updated ON public.document_search_scores USING btree (last_updated);


--
-- Name: permissions_module_action_resource_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissions_module_action_resource_key ON public.permissions USING btree (module, action, resource);


--
-- Name: permissions_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissions_name_key ON public.permissions USING btree (name);


--
-- Name: ppd_user_id_divisi_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ppd_user_id_divisi_id_key ON public.ppd USING btree (user_id, divisi_id);


--
-- Name: resources_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_parent_id_idx ON public.resources USING btree (parent_id);


--
-- Name: resources_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_path_idx ON public.resources USING btree (path);


--
-- Name: resources_required_capability_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_required_capability_idx ON public.resources USING btree (required_capability);


--
-- Name: resources_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_type_idx ON public.resources USING btree (type);


--
-- Name: resources_type_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_type_is_active_idx ON public.resources USING btree (type, is_active);


--
-- Name: resources_type_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_type_path_idx ON public.resources USING btree (type, path);


--
-- Name: role_capabilities_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_capabilities_category_idx ON public.role_capabilities USING btree (category);


--
-- Name: role_capabilities_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_capabilities_name_key ON public.role_capabilities USING btree (name);


--
-- Name: role_capability_assignments_capability_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_capability_assignments_capability_id_idx ON public.role_capability_assignments USING btree (capability_id);


--
-- Name: role_capability_assignments_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_capability_assignments_role_id_idx ON public.role_capability_assignments USING btree (role_id);


--
-- Name: role_permissions_role_id_permission_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: sessions_session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sessions_session_token_key ON public.sessions USING btree (session_token);


--
-- Name: system_config_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX system_config_key_key ON public.system_config USING btree (key);


--
-- Name: user_roles_assigned_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_assigned_by_idx ON public.user_roles USING btree (assigned_by);


--
-- Name: user_roles_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_is_active_idx ON public.user_roles USING btree (is_active);


--
-- Name: user_roles_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_role_id_idx ON public.user_roles USING btree (role_id);


--
-- Name: user_roles_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_user_id_idx ON public.user_roles USING btree (user_id);


--
-- Name: user_roles_user_id_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_user_id_is_active_idx ON public.user_roles USING btree (user_id, is_active);


--
-- Name: user_roles_user_id_role_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_roles_user_id_role_id_key ON public.user_roles USING btree (user_id, role_id);


--
-- Name: users_divisi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_divisi_id_idx ON public.users USING btree (divisi_id);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_external_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_external_id_key ON public.users USING btree (external_id);


--
-- Name: users_group_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_group_id_idx ON public.users USING btree (group_id);


--
-- Name: users_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_is_active_idx ON public.users USING btree (is_active);


--
-- Name: users_username_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_username_idx ON public.users USING btree (username);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: workflow_transitions_from_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_transitions_from_status_idx ON public.workflow_transitions USING btree (from_status);


--
-- Name: workflow_transitions_from_status_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_transitions_from_status_is_active_idx ON public.workflow_transitions USING btree (from_status, is_active);


--
-- Name: workflow_transitions_from_status_to_status_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workflow_transitions_from_status_to_status_key ON public.workflow_transitions USING btree (from_status, to_status);


--
-- Name: workflow_transitions_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_transitions_is_active_idx ON public.workflow_transitions USING btree (is_active);


--
-- Name: workflow_transitions_to_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_transitions_to_status_idx ON public.workflow_transitions USING btree (to_status);


--
-- Name: _GroupToMenu _GroupToMenu_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_GroupToMenu"
    ADD CONSTRAINT "_GroupToMenu_A_fkey" FOREIGN KEY ("A") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _GroupToMenu _GroupToMenu_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_GroupToMenu"
    ADD CONSTRAINT "_GroupToMenu_B_fkey" FOREIGN KEY ("B") REFERENCES public.menu(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: comments comments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: divisi divisi_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisi
    ADD CONSTRAINT divisi_head_id_fkey FOREIGN KEY (head_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: divisi divisi_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisi
    ADD CONSTRAINT divisi_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.divisi(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: document_activities document_activities_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_activities
    ADD CONSTRAINT document_activities_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: document_activities document_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_activities
    ADD CONSTRAINT document_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_history document_history_changed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_history
    ADD CONSTRAINT document_history_changed_by_id_fkey FOREIGN KEY (changed_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_history document_history_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_history
    ADD CONSTRAINT document_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: document_relations document_relations_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: document_relations document_relations_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: document_search_scores document_search_scores_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_search_scores
    ADD CONSTRAINT document_search_scores_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_versions document_versions_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: document_versions document_versions_parent_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_parent_version_id_fkey FOREIGN KEY (parent_version_id) REFERENCES public.document_versions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_approved_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documents documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.documents_type(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documents documents_parent_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_document_id_fkey FOREIGN KEY (parent_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: documents documents_updated_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: document_search_scores fk_document; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_search_scores
    ADD CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: menu menu_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menu(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ppd ppd_assigned_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppd
    ADD CONSTRAINT ppd_assigned_by_id_fkey FOREIGN KEY (assigned_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ppd ppd_divisi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppd
    ADD CONSTRAINT ppd_divisi_id_fkey FOREIGN KEY (divisi_id) REFERENCES public.divisi(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ppd ppd_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppd
    ADD CONSTRAINT ppd_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: resources resources_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.resources(id);


--
-- Name: role_capability_assignments role_capability_assignments_capability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_capability_assignments
    ADD CONSTRAINT role_capability_assignments_capability_id_fkey FOREIGN KEY (capability_id) REFERENCES public.role_capabilities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_capability_assignments role_capability_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_capability_assignments
    ADD CONSTRAINT role_capability_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: system_logs system_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_divisi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_divisi_id_fkey FOREIGN KEY (divisi_id) REFERENCES public.divisi(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

