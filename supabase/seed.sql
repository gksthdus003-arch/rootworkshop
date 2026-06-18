-- Workshop Guide Supabase seed data
-- Run after supabase/schema.sql.
--
-- This seed mirrors the 2026 workshop data from src/data/mockData.ts.
-- It is safe to rerun: inserts use ON CONFLICT upserts and do not delete,
-- truncate, or drop existing data.

insert into workshops (
  id,
  round,
  year,
  title,
  subtitle,
  period_label,
  start_date,
  status,
  location_label,
  preparation_items,
  venue_address,
  transportation_guide,
  map_link_url,
  is_default,
  is_published
) values (
  'workshop-2026',
  7,
  2026,
  '2026 워크숍 가이드',
  '함께 만드는 제품 성장 워크숍',
  '2026.07.02 - 2026.07.03',
  '2026-07-02',
  'pre',
  '곤지암 리조트',
  '["편한 복장과 운동화", "개인 세면도구", "개인 상비약", "휴대폰 충전기", "얇은 겉옷"]'::jsonb,
  '경기 광주시 도척면 도척윗로 278 곤지암리조트',
  '자가용 이용 시 곤지암리조트 남측 주차장을 이용해 주세요. 셔틀 탑승자는 출발 10분 전까지 회사 앞 집결 장소에 모여 주세요.',
  'https://map.naver.com/p/search/곤지암리조트',
  true,
  true
) on conflict (id) do update set
  round = excluded.round,
  year = excluded.year,
  title = excluded.title,
  subtitle = excluded.subtitle,
  period_label = excluded.period_label,
  start_date = excluded.start_date,
  status = excluded.status,
  location_label = excluded.location_label,
  preparation_items = excluded.preparation_items,
  venue_address = excluded.venue_address,
  transportation_guide = excluded.transportation_guide,
  map_link_url = excluded.map_link_url,
  is_default = excluded.is_default,
  is_published = excluded.is_published;

insert into workshop_posters (
  workshop_id,
  enabled,
  image_url,
  version,
  duration_ms,
  show_on_pre_first_visit,
  show_on_day1_first_visit
) values (
  'workshop-2026',
  true,
  '/assets/2026_workshop_poster.png',
  '2026-summer-v2',
  2000,
  true,
  true
) on conflict (workshop_id) do update set
  enabled = excluded.enabled,
  image_url = excluded.image_url,
  version = excluded.version,
  duration_ms = excluded.duration_ms,
  show_on_pre_first_visit = excluded.show_on_pre_first_visit,
  show_on_day1_first_visit = excluded.show_on_day1_first_visit;

insert into map_locations (
  workshop_id,
  id,
  name,
  description,
  category,
  x_percent,
  y_percent,
  is_workshop_location,
  is_smoking_area,
  sort_order
) values
  ('workshop-2026', 'main-hall', '로비', '참가자 집결 및 체크아웃 기준 장소', 'gathering', 38, 44, true, false, 10),
  ('workshop-2026', 'seminar-302', '컨퍼런스 룸', '경영라운지와 웰니스 프로그램 진행 장소', 'program', 46, 43, true, false, 20),
  ('workshop-2026', 'event-desk', '락볼링장', '대표님배 볼링대회 진행 장소', 'activity', 50, 50, true, false, 30),
  ('workshop-2026', 'cafeteria', '카페테리아', '점심 식사 장소', 'meal', 49, 34, true, false, 40),
  ('workshop-2026', 'neutinamu-bbq', '느티나무 BBQ', '저녁 식사 장소', 'meal', 54, 38, true, false, 50),
  ('workshop-2026', 'pub', '펍', '2차 및 휴식 장소', 'meal', 56, 45, true, false, 60),
  ('workshop-2026', 'damha', '한식당 담하', '2일차 아침 식사 장소', 'meal', 52, 31, true, false, 70),
  ('workshop-2026', 'smoking-main', '흡연구역', '빌리지센터 인근 흡연구역', 'other', 45, 48, false, true, 80),
  ('workshop-2026', 'smoking-condo', '흡연구역', '콘도 방향 흡연구역', 'other', 87, 56, false, true, 90),
  ('workshop-2026', 'ski-house', '루지360', '2일차 자유시간 선택 활동', 'activity', 35, 8, true, false, 100),
  ('workshop-2026', 'spa', '화담숲', '2일차 자유시간 선택 활동', 'activity', 73, 10, true, false, 110),
  ('workshop-2026', 'tennis-court', '족구장', '2일차 자유시간 야외 활동 장소', 'activity', 76, 91, true, false, 120)
on conflict (workshop_id, id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  x_percent = excluded.x_percent,
  y_percent = excluded.y_percent,
  is_workshop_location = excluded.is_workshop_location,
  is_smoking_area = excluded.is_smoking_area,
  sort_order = excluded.sort_order;

insert into schedule_items (
  workshop_id,
  id,
  title,
  description,
  display_time,
  start_at,
  end_at,
  location,
  location_id,
  category,
  sort_order
) values
  ('workshop-2026', '2026-day1-gathering', '집결', '워크숍 참가자 집결', '~10:00', '2026-07-02T09:00:00+09:00', '2026-07-02T10:00:00+09:00', '로비', null, 'orientation', 10),
  ('workshop-2026', '2026-day1-management-lounge', '경영라운지', '경영라운지 프로그램 진행', '10:00 - 13:00', '2026-07-02T10:00:00+09:00', '2026-07-02T13:00:00+09:00', '컨퍼런스 룸', null, 'session', 20),
  ('workshop-2026', '2026-day1-lunch', '점심 식사 & 자유시간', '점심 식사 후 자유시간', '13:00 - 14:50', '2026-07-02T13:00:00+09:00', '2026-07-02T14:50:00+09:00', '카페테리아', 'cafeteria', 'meal', 30),
  ('workshop-2026', '2026-day1-wellness', '웰니스 프로그램', '웰니스 프로그램 진행', '15:00 - 16:30', '2026-07-02T15:00:00+09:00', '2026-07-02T16:30:00+09:00', '컨퍼런스 룸', null, 'activity', 40),
  ('workshop-2026', '2026-day1-bowling', '대표님배 볼링대회', '개인전 방식으로 진행', '16:40 - 18:00', '2026-07-02T16:40:00+09:00', '2026-07-02T18:00:00+09:00', '락볼링장', null, 'event', 50),
  ('workshop-2026', '2026-day1-dinner', '저녁 식사 & 자유시간', '저녁 식사 후 자유시간', '19:00 - 20:30', '2026-07-02T19:00:00+09:00', '2026-07-02T20:30:00+09:00', '느티나무 BBQ', null, 'meal', 60),
  ('workshop-2026', '2026-day1-pub', '펍 2차 및 휴식', '펍에서 2차 진행 후 휴식', '20:30~', '2026-07-02T20:30:00+09:00', '2026-07-02T23:59:00+09:00', '펍', null, 'free', 70),
  ('workshop-2026', '2026-day2-breakfast', '아침 식사', '아침 식사', '08:00 - 09:00', '2026-07-03T08:00:00+09:00', '2026-07-03T09:00:00+09:00', '한식당 담하', null, 'meal', 80),
  ('workshop-2026', '2026-day2-free-time', '자유시간', '루지360 / 화담숲 / 족구 등 자유 활동', '09:00 - 12:00', '2026-07-03T09:00:00+09:00', '2026-07-03T12:00:00+09:00', '-', null, 'activity', 90),
  ('workshop-2026', '2026-day2-checkout', '체크아웃', '활동 인원은 출발 전 정리', '*11:00', '2026-07-03T11:00:00+09:00', '2026-07-03T11:10:00+09:00', '로비', null, 'orientation', 100),
  ('workshop-2026', '2026-day2-lunch-dismissal', '점심 식사 후 해산', '점심 식사 후 워크숍 종료 및 해산', '12:00 - 13:00', '2026-07-03T12:00:00+09:00', '2026-07-03T13:00:00+09:00', '외부 식당', null, 'meal', 110)
on conflict (workshop_id, id) do update set
  title = excluded.title,
  description = excluded.description,
  display_time = excluded.display_time,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  location = excluded.location,
  location_id = excluded.location_id,
  category = excluded.category,
  sort_order = excluded.sort_order;

insert into schedule_controls (
  workshop_id,
  mode,
  manual_current_schedule_id
) values (
  'workshop-2026',
  'auto',
  null
) on conflict (workshop_id) do update set
  mode = excluded.mode,
  manual_current_schedule_id = excluded.manual_current_schedule_id;

-- Insert survey events before the bowling event because the bowling event
-- trigger requires linked_survey_id to point at an existing bowlingLevel survey.
insert into events (
  id,
  workshop_id,
  title,
  description,
  type,
  survey_kind,
  event_kind,
  show_in_event_list,
  linked_survey_id,
  phase,
  status,
  opens_at,
  closes_at,
  requires_team_assignment,
  result_summary,
  sort_order
) values
  ('activity-pre-survey', 'workshop-2026', '액티비티 사전 설문', '유료 액티비티 참여 의사와 선호 종목을 확인합니다.', 'survey', 'activity', null, true, null, null, 'active', '2026-07-02T09:00:00+09:00', '2026-07-02T11:30:00+09:00', true, null, 10),
  ('bowling-level-test', 'workshop-2026', '볼링 대회 레벨 테스트', '공정한 조 편성을 위해 볼링 경험을 확인합니다.', 'survey', 'bowlingLevel', null, false, null, null, 'active', '2026-07-02T14:00:00+09:00', '2026-07-02T15:00:00+09:00', true, null, 20),
  ('team-result', 'workshop-2026', '조 배정 결과', '저녁 액티비티 조 배정 결과를 확인합니다.', 'survey', 'general', null, true, null, null, 'closed', '2026-07-02T16:00:00+09:00', '2026-07-02T17:00:00+09:00', true, '볼링 대회 조 배정이 완료되었습니다.', 40),
  ('transport-team', 'workshop-2026', '차량 이동 조', '워크숍 당일 차량 이동 조를 확인합니다.', 'survey', 'transport', null, false, null, null, 'closed', '2026-07-02T08:00:00+09:00', '2026-07-02T09:00:00+09:00', true, null, 50)
on conflict (id) do update set
  workshop_id = excluded.workshop_id,
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  survey_kind = excluded.survey_kind,
  event_kind = excluded.event_kind,
  show_in_event_list = excluded.show_in_event_list,
  linked_survey_id = excluded.linked_survey_id,
  phase = excluded.phase,
  status = excluded.status,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  requires_team_assignment = excluded.requires_team_assignment,
  result_summary = excluded.result_summary,
  sort_order = excluded.sort_order;

insert into events (
  id,
  workshop_id,
  title,
  description,
  type,
  survey_kind,
  event_kind,
  show_in_event_list,
  linked_survey_id,
  phase,
  status,
  opens_at,
  closes_at,
  requires_team_assignment,
  result_summary,
  sort_order
) values (
  'bowling-competition',
  'workshop-2026',
  '대표님배 볼링대회',
  '목표 점수와 실제 점수로 팀 순위를 확인합니다.',
  'event',
  null,
  'bowling',
  true,
  'bowling-level-test',
  'preSurvey',
  'active',
  '2026-07-02T16:40:00+09:00',
  '2026-07-02T18:00:00+09:00',
  true,
  null,
  30
) on conflict (id) do update set
  workshop_id = excluded.workshop_id,
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  survey_kind = excluded.survey_kind,
  event_kind = excluded.event_kind,
  show_in_event_list = excluded.show_in_event_list,
  linked_survey_id = excluded.linked_survey_id,
  phase = excluded.phase,
  status = excluded.status,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  requires_team_assignment = excluded.requires_team_assignment,
  result_summary = excluded.result_summary,
  sort_order = excluded.sort_order;

insert into survey_questions (
  event_id,
  id,
  type,
  label,
  description,
  required,
  options_json,
  sort_order
) values
  ('activity-pre-survey', 'intro', 'description', '안내', '오후 액티비티 준비를 위해 사전에 참여 여부를 확인합니다. 응답은 운영팀만 확인합니다.', false, '[]'::jsonb, 10),
  ('activity-pre-survey', 'paidActivity', 'singleChoice', '유료 액티비티에 참여하시겠어요?', null, true, '["참여", "불참", "현장에서 결정"]'::jsonb, 20),
  ('activity-pre-survey', 'preferredActivities', 'multipleChoice', '관심 있는 액티비티를 선택해 주세요.', null, false, '["볼링", "스파", "곤돌라", "산책 코스"]'::jsonb, 30),
  ('activity-pre-survey', 'memo', 'shortText', '운영팀에 전달할 내용이 있다면 적어주세요.', null, false, '[]'::jsonb, 40),
  ('bowling-level-test', 'guide', 'description', '조 편성 안내', '응답을 바탕으로 초급/중급/상급 참가자가 섞이도록 조를 구성합니다.', false, '[]'::jsonb, 10),
  ('bowling-level-test', 'level', 'singleChoice', '본인의 볼링 실력을 선택해 주세요.', null, true, '["초급", "중급", "상급"]'::jsonb, 20),
  ('bowling-level-test', 'experience', 'singleChoice', '최근 1년 내 볼링 경험이 있나요?', null, true, '["거의 없음", "가끔 있음", "자주 있음"]'::jsonb, 30),
  ('bowling-level-test', 'curve', 'singleChoice', '커브 또는 스핀 구사가 가능한가요?', null, true, '["아니요", "조금 가능", "가능"]'::jsonb, 40),
  ('bowling-level-test', 'averageScore', 'shortText', '최근 평균 점수를 알고 있다면 적어주세요.', null, false, '[]'::jsonb, 50),
  ('bowling-level-test', 'targetScore', 'shortText', '이번 볼링 목표 점수를 숫자로 입력해 주세요.', null, true, '[]'::jsonb, 60)
on conflict (event_id, id) do update set
  type = excluded.type,
  label = excluded.label,
  description = excluded.description,
  required = excluded.required,
  options_json = excluded.options_json,
  sort_order = excluded.sort_order;

insert into participants (
  id,
  workshop_id,
  name
) values
  ('participant-kim-minjun', 'workshop-2026', '김민준'),
  ('participant-lee-seoyeon', 'workshop-2026', '이서연'),
  ('participant-park-doyun', 'workshop-2026', '박도윤'),
  ('participant-choi-jiwoo', 'workshop-2026', '최지우'),
  ('participant-jeong-hajun', 'workshop-2026', '정하준'),
  ('participant-han-sua', 'workshop-2026', '한수아'),
  ('participant-oh-jihun', 'workshop-2026', '오지훈'),
  ('participant-kang-yerin', 'workshop-2026', '강예린')
on conflict (id) do update set
  workshop_id = excluded.workshop_id,
  name = excluded.name;

insert into event_teams (
  event_id,
  id,
  name,
  memo,
  sort_order
) values
  ('bowling-level-test', 'bowling-team-a', 'A조', '초급/중급 균형 조', 10),
  ('bowling-level-test', 'bowling-team-b', 'B조', '상급 리드 포함', 20),
  ('bowling-competition', 'bowling-team-a', 'A조', '초급/중급 균형 조', 10),
  ('bowling-competition', 'bowling-team-b', 'B조', '상급 리드 포함', 20),
  ('team-result', 'team-result-a', 'A조', '초급/중급 균형 조', 10),
  ('team-result', 'team-result-b', 'B조', '상급 리드 포함', 20),
  ('transport-team', 'transport-bus-1', '1호차', '08:30까지 본관 앞 집결', 10),
  ('transport-team', 'transport-bus-2', '2호차', '08:40까지 7번 주차장 집결', 20)
on conflict (event_id, id) do update set
  name = excluded.name,
  memo = excluded.memo,
  sort_order = excluded.sort_order;

insert into event_team_members (
  event_id,
  team_id,
  participant_id,
  participant_name,
  sort_order
) values
  ('bowling-level-test', 'bowling-team-a', 'participant-kim-minjun', '김민준', 10),
  ('bowling-level-test', 'bowling-team-a', 'participant-lee-seoyeon', '이서연', 20),
  ('bowling-level-test', 'bowling-team-a', 'participant-park-doyun', '박도윤', 30),
  ('bowling-level-test', 'bowling-team-a', 'participant-choi-jiwoo', '최지우', 40),
  ('bowling-level-test', 'bowling-team-b', 'participant-jeong-hajun', '정하준', 10),
  ('bowling-level-test', 'bowling-team-b', 'participant-han-sua', '한수아', 20),
  ('bowling-level-test', 'bowling-team-b', 'participant-oh-jihun', '오지훈', 30),
  ('bowling-level-test', 'bowling-team-b', 'participant-kang-yerin', '강예린', 40),
  ('bowling-competition', 'bowling-team-a', 'participant-kim-minjun', '김민준', 10),
  ('bowling-competition', 'bowling-team-a', 'participant-lee-seoyeon', '이서연', 20),
  ('bowling-competition', 'bowling-team-a', 'participant-park-doyun', '박도윤', 30),
  ('bowling-competition', 'bowling-team-a', 'participant-choi-jiwoo', '최지우', 40),
  ('bowling-competition', 'bowling-team-b', 'participant-jeong-hajun', '정하준', 10),
  ('bowling-competition', 'bowling-team-b', 'participant-han-sua', '한수아', 20),
  ('bowling-competition', 'bowling-team-b', 'participant-oh-jihun', '오지훈', 30),
  ('bowling-competition', 'bowling-team-b', 'participant-kang-yerin', '강예린', 40),
  ('team-result', 'team-result-a', 'participant-kim-minjun', '김민준', 10),
  ('team-result', 'team-result-a', 'participant-lee-seoyeon', '이서연', 20),
  ('team-result', 'team-result-a', 'participant-park-doyun', '박도윤', 30),
  ('team-result', 'team-result-a', 'participant-choi-jiwoo', '최지우', 40),
  ('team-result', 'team-result-b', 'participant-jeong-hajun', '정하준', 10),
  ('team-result', 'team-result-b', 'participant-han-sua', '한수아', 20),
  ('team-result', 'team-result-b', 'participant-oh-jihun', '오지훈', 30),
  ('team-result', 'team-result-b', 'participant-kang-yerin', '강예린', 40),
  ('transport-team', 'transport-bus-1', 'participant-kim-minjun', '김민준', 10),
  ('transport-team', 'transport-bus-1', 'participant-lee-seoyeon', '이서연', 20),
  ('transport-team', 'transport-bus-1', 'participant-park-doyun', '박도윤', 30),
  ('transport-team', 'transport-bus-1', 'participant-choi-jiwoo', '최지우', 40),
  ('transport-team', 'transport-bus-2', 'participant-jeong-hajun', '정하준', 10),
  ('transport-team', 'transport-bus-2', 'participant-han-sua', '한수아', 20),
  ('transport-team', 'transport-bus-2', 'participant-oh-jihun', '오지훈', 30),
  ('transport-team', 'transport-bus-2', 'participant-kang-yerin', '강예린', 40)
on conflict (event_id, participant_name) do update set
  team_id = excluded.team_id,
  participant_id = excluded.participant_id,
  sort_order = excluded.sort_order;

insert into recommendations (
  workshop_id,
  id,
  title,
  description,
  category,
  location_label,
  image_url,
  is_visible,
  sort_order
) values
  ('workshop-2026', 'forest-stream', '생태하천', '팀 빌딩 전 가볍게 걷기 좋은 산책 코스입니다.', '자연 휴양지', '리조트 광장 옆 산책로', '/assets/recommendation-eco-stream.png', true, 10),
  ('workshop-2026', 'music-camp', '뮤직캠프', '자유시간에 소규모로 들르기 좋은 노래방 공간입니다.', '실내 콘텐츠', '빌리지센터 지하 1층', '/assets/recommendation-music-camp.png', true, 20),
  ('workshop-2026', 'leports-camp', '레포츠캠프', '탁구와 간단한 실내 게임을 즐길 수 있는 공간입니다.', '실내 스포츠', '빌리지센터 1층', '/assets/recommendation-table-tennis.png', true, 30),
  ('workshop-2026', 'foot-volleyball', '족구장', '팀별 친목 경기에 적합한 야외 코트입니다.', '야외 스포츠', '리조트 야외 운동장', '/assets/recommendation-foot-volleyball.png', true, 40)
on conflict (workshop_id, id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  location_label = excluded.location_label,
  image_url = excluded.image_url,
  is_visible = excluded.is_visible,
  sort_order = excluded.sort_order;

insert into announcements (
  workshop_id,
  id,
  title,
  body,
  is_important,
  show_on_home_banner,
  created_at
) values
  ('workshop-2026', 'notice-checkin', '객실 체크인 안내', '체크인은 운영 데스크에서 명단 확인 후 진행됩니다.', true, true, '2026-06-01T09:00:00+09:00'),
  ('workshop-2026', 'notice-dinner', '저녁 식사 장소 안내', '저녁 식사는 카페테리아에서 18:00부터 진행됩니다.', false, false, '2026-06-01T10:00:00+09:00')
on conflict (workshop_id, id) do update set
  title = excluded.title,
  body = excluded.body,
  is_important = excluded.is_important,
  show_on_home_banner = excluded.show_on_home_banner,
  created_at = excluded.created_at;

-- Current mockData has no persisted event responses or bowling scores.
-- Keep operating seed data clean; add test responses/scores in a separate
-- development-only seed if needed.
