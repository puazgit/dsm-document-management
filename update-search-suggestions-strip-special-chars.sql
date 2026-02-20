-- Update get_search_suggestions function to strip special characters
-- This allows words with special characters like "(BJPSDA)" to match "bjp" queries

CREATE OR REPLACE FUNCTION get_search_suggestions(
  query_prefix text,
  max_results integer DEFAULT 10
) RETURNS TABLE(
  suggestion text,
  frequency bigint
) AS $$
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
$$ LANGUAGE SQL STABLE;

-- Verify the update
COMMENT ON FUNCTION get_search_suggestions IS 'Get autocomplete suggestions based on document titles and tags (strips special characters for better matching)';

-- Test the function with "bjp" query
SELECT * FROM get_search_suggestions('bjp', 10);
