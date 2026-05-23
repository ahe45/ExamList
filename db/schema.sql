CREATE TABLE IF NOT EXISTS schools (
  id VARCHAR(64) NOT NULL COMMENT '학교 식별자',
  code VARCHAR(80) NOT NULL DEFAULT '' COMMENT '학교 코드',
  name VARCHAR(200) NOT NULL COMMENT '학교명',
  description VARCHAR(255) NOT NULL DEFAULT '' COMMENT '학교 설명',
  deletion_password_hash VARCHAR(255) NOT NULL DEFAULT '' COMMENT '학교 삭제 비밀번호 해시',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '학교 사용 여부',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  deleted_at DATETIME NULL COMMENT '삭제 일시',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_schools_code (code),
  KEY idx_schools_active (is_active, deleted_at),
  KEY idx_schools_name (name)
) COMMENT='학교 기본 정보';

CREATE TABLE IF NOT EXISTS pdf_templates (
  id VARCHAR(64) NOT NULL COMMENT 'PDF 템플릿 식별자',
  school_id VARCHAR(64) NOT NULL DEFAULT 'school-default' COMMENT '학교 식별자',
  name VARCHAR(200) NOT NULL COMMENT 'PDF 템플릿명',
  description VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'PDF 템플릿 설명',
  paper_preset ENUM('A4', 'A3', 'B4', 'B5', 'Letter', 'Legal', 'Custom') NOT NULL DEFAULT 'A4' COMMENT 'PDF 용지 규격',
  orientation ENUM('portrait', 'landscape') NOT NULL DEFAULT 'portrait' COMMENT 'PDF 용지 방향',
  generation_unit ENUM('all', 'admission', 'admissionCode', 'exam', 'examDate', 'seriesCode', 'periodCode', 'room', 'roomCode', 'group', 'unit', 'unitCode', 'buildingCode', 'custom') NOT NULL DEFAULT 'roomCode' COMMENT 'PDF 생성 단위',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '템플릿 사용 여부',
  cover_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '표지 페이지 사용 여부',
  content_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '내용 페이지 사용 여부',
  latest_version_no INT NOT NULL DEFAULT 1 COMMENT '최신 버전 번호',
  layout_json LONGTEXT NOT NULL COMMENT '현재 템플릿 레이아웃 JSON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  deleted_at DATETIME NULL COMMENT '삭제 일시',
  PRIMARY KEY (id),
  KEY idx_pdf_templates_school_active (school_id, is_active, deleted_at),
  KEY idx_pdf_templates_active (is_active, deleted_at),
  KEY idx_pdf_templates_updated_at (updated_at),
  CONSTRAINT fk_pdf_templates_school
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON DELETE RESTRICT
) COMMENT='PDF 템플릿 기본 정보';

CREATE TABLE IF NOT EXISTS pdf_template_versions (
  id VARCHAR(64) NOT NULL COMMENT '템플릿 버전 식별자',
  template_id VARCHAR(64) NOT NULL COMMENT 'PDF 템플릿 식별자',
  version_no INT NOT NULL COMMENT '버전 번호',
  snapshot_json LONGTEXT NOT NULL COMMENT '버전 저장 시점의 템플릿 스냅샷 JSON',
  created_by VARCHAR(100) NOT NULL DEFAULT 'system' COMMENT '버전 생성자',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '버전 생성 일시',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_pdf_template_versions_template_version (template_id, version_no),
  CONSTRAINT fk_pdf_template_versions_template
    FOREIGN KEY (template_id) REFERENCES pdf_templates (id)
    ON DELETE CASCADE
) COMMENT='PDF 템플릿 버전 스냅샷';

CREATE TABLE IF NOT EXISTS pdf_template_pages (
  id VARCHAR(64) NOT NULL COMMENT '템플릿 페이지 식별자',
  template_id VARCHAR(64) NOT NULL COMMENT 'PDF 템플릿 식별자',
  page_type ENUM('cover', 'content', 'static', 'appendix') NOT NULL COMMENT '페이지 유형',
  name VARCHAR(120) NOT NULL COMMENT '페이지명',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '페이지 정렬 순서',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '페이지 사용 여부',
  repeatable TINYINT(1) NOT NULL DEFAULT 0 COMMENT '데이터에 따라 반복 생성되는 페이지 여부',
  width_pt DECIMAL(10, 2) NOT NULL COMMENT '페이지 너비 pt',
  height_pt DECIMAL(10, 2) NOT NULL COMMENT '페이지 높이 pt',
  settings_json LONGTEXT NOT NULL COMMENT '페이지 설정 JSON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (id),
  KEY idx_pdf_template_pages_template (template_id, sort_order),
  CONSTRAINT fk_pdf_template_pages_template
    FOREIGN KEY (template_id) REFERENCES pdf_templates (id)
    ON DELETE CASCADE
) COMMENT='PDF 템플릿 페이지 정보';

CREATE TABLE IF NOT EXISTS pdf_template_elements (
  id VARCHAR(64) NOT NULL COMMENT '템플릿 요소 식별자',
  template_id VARCHAR(64) NOT NULL COMMENT 'PDF 템플릿 식별자',
  page_id VARCHAR(64) NOT NULL COMMENT '템플릿 페이지 식별자',
  element_type ENUM('text', 'dataText', 'image', 'candidatePhoto', 'table', 'line', 'rect', 'ellipse', 'checkbox', 'signatureBox', 'pageNumber') NOT NULL COMMENT '요소 유형',
  name VARCHAR(120) NOT NULL COMMENT '요소명',
  x_pt DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '요소 X 좌표 pt',
  y_pt DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '요소 Y 좌표 pt',
  width_pt DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '요소 너비 pt',
  height_pt DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '요소 높이 pt',
  z_index INT NOT NULL DEFAULT 0 COMMENT '요소 표시 순서',
  locked TINYINT(1) NOT NULL DEFAULT 0 COMMENT '요소 잠금 여부',
  visible TINYINT(1) NOT NULL DEFAULT 1 COMMENT '요소 표시 여부',
  config_json LONGTEXT NOT NULL COMMENT '요소 세부 설정 JSON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (id),
  KEY idx_pdf_template_elements_page (page_id, z_index),
  CONSTRAINT fk_pdf_template_elements_template
    FOREIGN KEY (template_id) REFERENCES pdf_templates (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pdf_template_elements_page
    FOREIGN KEY (page_id) REFERENCES pdf_template_pages (id)
    ON DELETE CASCADE
) COMMENT='PDF 템플릿 배치 요소';

CREATE TABLE IF NOT EXISTS candidate_records (
  id VARCHAR(64) NOT NULL COMMENT '수험생 데이터 식별자',
  school_id VARCHAR(64) NOT NULL DEFAULT 'school-default' COMMENT '학교 식별자',
  source_type ENUM('manual', 'csv', 'xlsx') NOT NULL DEFAULT 'manual' COMMENT '데이터 입력 원본 유형',
  source_id VARCHAR(120) NOT NULL DEFAULT '' COMMENT '원본 시스템의 데이터 식별자',
  designated_sort VARCHAR(120) NOT NULL DEFAULT '' COMMENT '지정정렬',
  admission_year VARCHAR(20) NOT NULL DEFAULT '' COMMENT '모집년도',
  exam_date DATE NULL COMMENT '시험일',
  time VARCHAR(40) NOT NULL DEFAULT '' COMMENT '시작시간',
  end_time VARCHAR(40) NOT NULL DEFAULT '' COMMENT '종료시간',
  track VARCHAR(120) NOT NULL DEFAULT '' COMMENT '모집시기',
  campus VARCHAR(120) NOT NULL DEFAULT '' COMMENT '캠퍼스명',
  campus_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '캠퍼스 코드',
  admission VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전형명',
  admission_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전형 코드',
  series VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계열명',
  series_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계열 코드',
  unit VARCHAR(120) NOT NULL DEFAULT '' COMMENT '모집단위명',
  unit_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '모집단위 코드',
  major VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전공명',
  major_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전공 코드',
  building VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사건물명',
  building_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사 건물 코드',
  room VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사실명',
  group_name VARCHAR(120) NOT NULL DEFAULT '' COMMENT '조 또는 그룹명',
  room_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사실 코드',
  period VARCHAR(120) NOT NULL DEFAULT '' COMMENT '교시명',
  period_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '교시 코드',
  examinee_no VARCHAR(120) NOT NULL DEFAULT '' COMMENT '수험번호',
  temporary_no VARCHAR(120) NOT NULL DEFAULT '' COMMENT '가번호',
  name VARCHAR(120) NOT NULL DEFAULT '' COMMENT '수험생 성명',
  birth_date DATE NULL COMMENT '수험생 생년월일',
  opt1 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 1',
  opt2 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 2',
  opt3 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 3',
  opt4 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 4',
  opt5 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 5',
  photo_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '수험생 사진 파일명 또는 참조명',
  photo_mime VARCHAR(120) NOT NULL DEFAULT '' COMMENT '수험생 사진 MIME 타입',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_candidate_records_school_source (school_id, source_type, source_id),
  KEY idx_candidate_records_lookup (school_id, exam_date, room, examinee_no),
  KEY idx_candidate_records_name (name),
  KEY idx_candidate_records_admission (school_id, admission, exam_date),
  CONSTRAINT fk_candidate_records_school
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON DELETE RESTRICT
) COMMENT='수험생확인대장 프로젝트 수험생 데이터';

CREATE TABLE IF NOT EXISTS pdf_generation_histories (
  id VARCHAR(64) NOT NULL COMMENT 'PDF 생성 이력 식별자',
  school_id VARCHAR(64) NOT NULL DEFAULT 'school-default' COMMENT '학교 식별자',
  template_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '생성에 사용한 템플릿 식별자',
  template_name VARCHAR(200) NOT NULL DEFAULT '' COMMENT '생성에 사용한 템플릿명',
  file_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '생성된 PDF 파일명',
  file_path VARCHAR(500) NOT NULL DEFAULT '' COMMENT '생성된 PDF 저장 경로',
  generation_unit ENUM('all', 'admission', 'admissionCode', 'exam', 'examDate', 'seriesCode', 'periodCode', 'room', 'roomCode', 'group', 'unit', 'unitCode', 'buildingCode', 'custom') NOT NULL DEFAULT 'roomCode' COMMENT 'PDF 생성 단위',
  target_name VARCHAR(120) NOT NULL DEFAULT '' COMMENT '생성 대상명',
  candidate_count INT NOT NULL DEFAULT 0 COMMENT 'PDF 생성 대상 수험생 수',
  page_count INT NOT NULL DEFAULT 0 COMMENT '생성된 PDF 페이지 수',
  file_size_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '생성된 PDF 파일 크기 바이트',
  status ENUM('queued', 'running', 'completed', 'failed') NOT NULL DEFAULT 'completed' COMMENT '생성 작업 상태',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 100 COMMENT '생성 진행률',
  job_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '큐 작업 식별자',
  batch_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '일괄 생성 식별자',
  attempt_count INT NOT NULL DEFAULT 1 COMMENT '현재 시도 횟수',
  max_attempts INT NOT NULL DEFAULT 1 COMMENT '최대 시도 횟수',
  warning_json LONGTEXT NOT NULL COMMENT '생성 경고 JSON',
  error_message VARCHAR(255) NOT NULL DEFAULT '' COMMENT '생성 실패 메시지',
  request_json LONGTEXT NULL COMMENT 'PDF 생성 요청 JSON',
  expires_at DATETIME NULL COMMENT '보관 만료 일시',
  purged_at DATETIME NULL COMMENT '파일 정리 일시',
  started_at DATETIME NULL COMMENT '생성 시작 일시',
  completed_at DATETIME NULL COMMENT '생성 완료 일시',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '이력 생성 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '이력 수정 일시',
  PRIMARY KEY (id),
  KEY idx_pdf_generation_histories_school_created_at (school_id, created_at),
  KEY idx_pdf_generation_histories_created_at (created_at),
  KEY idx_pdf_generation_histories_template (template_id, created_at),
  KEY idx_pdf_generation_histories_status (status, created_at),
  KEY idx_pdf_generation_histories_job (job_id),
  KEY idx_pdf_generation_histories_batch (batch_id, status),
  KEY idx_pdf_generation_histories_expires_at (expires_at, purged_at),
  CONSTRAINT fk_pdf_generation_histories_school
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON DELETE RESTRICT
) COMMENT='PDF 생성 이력';

CREATE TABLE IF NOT EXISTS pdf_generation_batches (
  id VARCHAR(64) NOT NULL COMMENT 'PDF 일괄 생성 식별자',
  school_id VARCHAR(64) NOT NULL DEFAULT 'school-default' COMMENT '학교 식별자',
  template_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '일괄 생성에 사용한 템플릿 식별자',
  template_name VARCHAR(200) NOT NULL DEFAULT '' COMMENT '일괄 생성에 사용한 템플릿명',
  generation_unit ENUM('all', 'admission', 'admissionCode', 'exam', 'examDate', 'seriesCode', 'periodCode', 'room', 'roomCode', 'group', 'unit', 'unitCode', 'buildingCode', 'custom') NOT NULL DEFAULT 'roomCode' COMMENT 'PDF 생성 단위',
  status ENUM('queued', 'running', 'completed', 'failed') NOT NULL DEFAULT 'queued' COMMENT '일괄 생성 상태',
  total_requested INT NOT NULL DEFAULT 0 COMMENT '요청된 생성 작업 수',
  queued_count INT NOT NULL DEFAULT 0 COMMENT '대기 중인 작업 수',
  running_count INT NOT NULL DEFAULT 0 COMMENT '진행 중인 작업 수',
  succeeded_count INT NOT NULL DEFAULT 0 COMMENT '성공한 작업 수',
  failed_count INT NOT NULL DEFAULT 0 COMMENT '실패한 작업 수',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '일괄 생성 진행률',
  archive_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '압축 파일 식별자',
  archive_file_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '압축 파일명',
  archive_file_path VARCHAR(500) NOT NULL DEFAULT '' COMMENT '압축 파일 저장 경로',
  request_json LONGTEXT NULL COMMENT '일괄 생성 요청 JSON',
  error_message VARCHAR(255) NOT NULL DEFAULT '' COMMENT '일괄 생성 실패 메시지',
  completed_at DATETIME NULL COMMENT '일괄 생성 완료 일시',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '일괄 생성 등록 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '일괄 생성 수정 일시',
  PRIMARY KEY (id),
  KEY idx_pdf_generation_batches_status (status, created_at),
  KEY idx_pdf_generation_batches_template (template_id, created_at),
  KEY idx_pdf_generation_batches_school (school_id, created_at),
  CONSTRAINT fk_pdf_generation_batches_school
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON DELETE RESTRICT
) COMMENT='PDF 일괄 생성 작업';

CREATE TABLE IF NOT EXISTS pdf_audit_logs (
  id VARCHAR(64) NOT NULL COMMENT '감사 로그 식별자',
  action VARCHAR(80) NOT NULL COMMENT '수행 작업명',
  entity_type VARCHAR(80) NOT NULL COMMENT '대상 엔티티 유형',
  entity_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '대상 엔티티 식별자',
  status VARCHAR(32) NOT NULL DEFAULT '' COMMENT '작업 처리 상태',
  metadata_json LONGTEXT NOT NULL COMMENT '감사 로그 부가 정보 JSON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '감사 로그 생성 일시',
  PRIMARY KEY (id),
  KEY idx_pdf_audit_logs_entity (entity_type, entity_id, created_at),
  KEY idx_pdf_audit_logs_action (action, created_at)
) COMMENT='PDF 기능 감사 로그';

CREATE TABLE IF NOT EXISTS admin_accounts (
  id VARCHAR(64) NOT NULL COMMENT '관리자 계정 식별자',
  user_id VARCHAR(100) NOT NULL COMMENT '로그인 ID',
  user_name VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계정 표시명',
  password_hash VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
  role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user' COMMENT '계정 권한',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '계정 사용 여부',
  last_login_at DATETIME NULL COMMENT '마지막 로그인 일시',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '계정 생성 일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '계정 수정 일시',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_admin_accounts_user_id (user_id),
  KEY idx_admin_accounts_role_active (role, is_active)
) COMMENT='관리자 로그인 계정';

CREATE TABLE IF NOT EXISTS school_settings (
  id VARCHAR(64) NOT NULL COMMENT '학교 설정 식별자',
  school_id VARCHAR(64) NOT NULL DEFAULT 'school-default' COMMENT '학교 식별자',
  school_name VARCHAR(200) NOT NULL DEFAULT '' COMMENT '학교명',
  academic_year VARCHAR(20) NOT NULL DEFAULT '' COMMENT '모집년도',
  logo_data_url LONGTEXT NULL COMMENT '학교 로고 이미지 데이터 URL',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '학교 설정 수정 일시',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_school_settings_school (school_id),
  CONSTRAINT fk_school_settings_school
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON DELETE CASCADE
) COMMENT='수험생확인대장 학교 표시 설정';
