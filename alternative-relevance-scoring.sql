-- ALTERNATIVE 1: Separate Search Scores Table (Without modifying documents table)
-- This creates a materialized view for search ranking without altering documents

-- Step 1: Create document_search_scores table
CREATE TABLE IF NOT EXISTS document_search_scores (
  document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  popularity_score NUMERIC DEFAULT 0,
  status_boost NUMERIC DEFAULT 1.0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Store pre-calculated metrics
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Index for fast lookups
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_search_scores_popularity ON document_search_scores(popularity_score DESC);
CREATE INDEX idx_document_search_scores_updated ON document_search_scores(last_updated);

-- Step 2: Function to calculate popularity score
CREATE OR REPLACE FUNCTION calculate_popularity_score(
  p_view_count INTEGER,
  p_download_count INTEGER,
  p_comment_count INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  -- Logarithmic scale to prevent outliers
  -- Downloads weighted 2x, comments 1.5x
  RETURN 1 + log(1 + p_view_count + (p_download_count * 2) + (p_comment_count * 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Function to get status boost multiplier
CREATE OR REPLACE FUNCTION get_status_boost(p_status TEXT) RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE 
    WHEN p_status = 'PUBLISHED' THEN 1.5
    WHEN p_status = 'APPROVED' THEN 1.3
    WHEN p_status = 'REVIEWED' THEN 1.1
    ELSE 1.0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Function to refresh scores for all documents
CREATE OR REPLACE FUNCTION refresh_search_scores() RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Step 5: Trigger to auto-update scores when documents change
CREATE OR REPLACE FUNCTION update_document_search_score() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_search_score ON documents;
CREATE TRIGGER trigger_update_search_score
  AFTER INSERT OR UPDATE OF view_count, download_count, status ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_search_score();

-- Step 6: Enhanced search function with relevance scoring
-- This uses ILIKE for simple text matching + scoring from separate table
CREATE OR REPLACE FUNCTION search_documents_with_ranking(
  p_query TEXT,
  p_status TEXT[] DEFAULT NULL,
  p_document_type_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
  document_id TEXT,
  title TEXT,
  description TEXT,
  status TEXT,
  relevance_score NUMERIC,
  view_count INTEGER,
  download_count INTEGER
) AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Initial population of scores
SELECT refresh_search_scores();

-- Test the new ranking system
SELECT * FROM search_documents_with_ranking('listrik', ARRAY['PUBLISHED', 'APPROVED']::TEXT[], NULL, 10, 0);

-- Verify scores are created
SELECT 
  d.title,
  s.popularity_score,
  s.status_boost,
  s.view_count,
  s.download_count
FROM documents d
JOIN document_search_scores s ON d.id = s.document_id
ORDER BY s.popularity_score DESC
LIMIT 10;
