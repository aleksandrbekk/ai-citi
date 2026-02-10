-- 069_grant_coach_functions.sql
-- Даём anon и authenticated доступ к coach RPC функциям

GRANT EXECUTE ON FUNCTION get_coach_limit(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION spend_coach_message(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION buy_coach_messages(BIGINT, INT) TO anon, authenticated;
