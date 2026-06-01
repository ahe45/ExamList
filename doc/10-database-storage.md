# DB와 파일 저장소

이 문서는 DB 테이블과 파일 저장소 중심 명세다. `pdf_templates.layout_json`, `pdf_template_pages.settings_json`, `pdf_template_elements.config_json`의 실제 JSON 정규화 규칙은 [양식 레이아웃과 편집기 런타임 상세 명세](14-template-layout-editor-deep-dive.md)를 함께 본다.

## DB bootstrap

서버 시작 시 `db/schema.sql`을 기준으로 테이블을 생성하고, `server/modules/bootstrap/` 하위 schema 보정 모듈이 누락 컬럼과 인덱스를 확인한다.

기준 테이블은 총 11개이다.

1. `schools`
2. `pdf_templates`
3. `pdf_template_versions`
4. `pdf_template_pages`
5. `pdf_template_elements`
6. `candidate_records`
7. `pdf_generation_histories`
8. `pdf_generation_batches`
9. `pdf_audit_logs`
10. `admin_accounts`
11. `school_settings`

## `schools`

학교 기본 정보.

- `id`: 학교 식별자.
- `code`: 학교 코드, unique.
- `name`: 학교명.
- `description`: 설명.
- `deletion_password_hash`: 학교 삭제 비밀번호 hash.
- `created_account`: 학교 생성 계정 ID. 학교 수정/삭제 권한 판정에 사용된다.
- `created_at`, `updated_at`, `deleted_at`.

## `school_settings`

학교 표시 설정.

- `id`.
- `school_id`: unique.
- `school_name`: 양식에 표시할 학교명.
- `academic_year`: 학년도.
- `logo_data_url`: 로고 data URL.
- `updated_at`.

## `admin_accounts`

운영자 계정.

- `id`.
- `user_id`: 로그인 ID, unique.
- `user_name`: 표시명.
- `password_hash`.
- `role`: `super_admin`, `admin`, `user`.
- `is_active`.
- `last_login_at`.
- `created_at`, `updated_at`.

## `pdf_templates`

템플릿 기본 정보와 현재 layout snapshot.

- `id`.
- `school_id`.
- `name`.
- `description`.
- `paper_preset`.
- `orientation`.
- `generation_unit`.
- `is_active`.
- `cover_enabled`.
- `content_enabled`.
- `latest_version_no`.
- `layout_json`: 현재 템플릿 layout JSON.
- `created_at`, `updated_at`, `deleted_at`.

## `pdf_template_versions`

템플릿 저장 이력.

- `id`.
- `template_id`.
- `version_no`.
- `snapshot_json`.
- `created_by`.
- `created_at`.

## `pdf_template_pages`

템플릿 페이지 구성.

- `id`.
- `template_id`.
- `page_type`: `cover`, `content`, `static`, `appendix`.
- `name`.
- `sort_order`.
- `enabled`.
- `repeatable`.
- `width_pt`, `height_pt`.
- `settings_json`.
- `created_at`, `updated_at`.

## `pdf_template_elements`

레거시 또는 구조화된 템플릿 요소.

- `id`.
- `template_id`.
- `page_id`.
- `element_type`: `text`, `dataText`, `image`, `candidatePhoto`, `table`, `line`, `rect`, `ellipse`, `checkbox`, `signatureBox`, `pageNumber`.
- `name`.
- `x_pt`, `y_pt`, `width_pt`, `height_pt`.
- `z_index`.
- `locked`.
- `visible`.
- `config_json`.
- `created_at`, `updated_at`.

현 편집기는 주로 `page.settings.documentHtml`을 사용하지만 이 테이블은 legacy element 모델과 호환된다.

## `candidate_records`

수험생 원천 데이터.

- `id`.
- `school_id`.
- `source_type`: `manual`, `csv`, `xlsx`.
- `source_id`.
- `designated_sort`.
- `admission_year`.
- `exam_date`.
- `time`.
- `end_time`.
- `track`.
- `admission`, `admission_code`.
- `series`, `series_code`.
- `unit`, `unit_code`.
- `major`, `major_code`.
- `building`, `building_code`.
- `room`, `room_code`.
- `period`, `period_code`.
- `examinee_no`.
- `temporary_no`.
- `name`.
- `birth_date`.
- `group_name`.
- `opt1`에서 `opt5`.
- `photo_name`.
- `photo_mime`.
- `created_at`, `updated_at`.

유니크 기준:

- `(school_id, source_type, source_id)`.

## `pdf_generation_histories`

개별 PDF 생성 이력.

- `id`.
- `school_id`.
- `template_id`.
- `template_name`.
- `file_name`.
- `file_path`.
- `generation_unit`.
- `target_name`.
- `candidate_count`.
- `page_count`.
- `file_size_bytes`.
- `status`: `queued`, `running`, `completed`, `failed`.
- `progress_percent`.
- `job_id`.
- `batch_id`.
- `attempt_count`.
- `max_attempts`.
- `warning_json`.
- `error_message`.
- `request_json`: 생성 요청과 템플릿 snapshot.
- `expires_at`.
- `purged_at`.
- `started_at`.
- `completed_at`.
- `created_at`, `updated_at`.

## `pdf_generation_batches`

배치 생성 작업.

- `id`.
- `school_id`.
- `template_id`.
- `template_name`.
- `generation_unit`.
- `status`.
- `total_requested`.
- `queued_count`.
- `running_count`.
- `succeeded_count`.
- `failed_count`.
- `progress_percent`.
- `archive_id`.
- `archive_file_name`.
- `archive_file_path`.
- `request_json`.
- `error_message`.
- `completed_at`.
- `created_at`, `updated_at`.

## `pdf_audit_logs`

PDF 관련 감사 로그.

- `id`.
- `action`.
- `entity_type`.
- `entity_id`.
- `status`.
- `metadata_json`.
- `created_at`.

## PDF 저장소

저장소 기본 root:

- `EXAMLIST_STORAGE_DIR`가 있으면 해당 경로.
- 없으면 프로젝트 루트의 `storage`.

PDF 저장 root:

- 신규 PDF 파일은 항상 `<storage root>/<schoolCode>/pdf-generations`에 저장한다.
- `PDF_STORAGE_DIR`는 신규 저장 루트로 사용하지 않으며, 기존 파일 호환을 위한 legacy 조회 루트로만 유지한다.
- `PDF_STORAGE_DIR`가 없으면 legacy 조회 루트는 `<storage root>/pdf-generations`이다.

하위 디렉터리:

- `files`: 개별 생성 PDF.
- `archives`: ZIP archive.
- `merged`: 병합 PDF.
- `tmp`: 렌더링 임시 작업 디렉터리.
- `previews`: PDF 생성 미리보기 파일.

PDF preview 파일:

- id 형식: `pdf-generation-preview-UUID`.
- 확장자: `.pdf`.
- 2시간 이상 된 preview는 cleanup 대상.

## 수험생 사진 저장소

- 사진 ZIP 또는 개별 업로드를 통해 저장된다.
- DB에는 `photo_name`, `photo_mime` 등 참조 정보가 저장된다.
- 신규 저장 경로는 `<storage root>/<schoolCode>/candidate-photos`이다.
- 기존 파일 호환을 위해 `<storage root>/candidate-photos`도 사진 조회/삭제 후보 경로로 사용한다.
- 실제 파일 삭제는 데이터 삭제와 학교 삭제 시 파일 시스템 삭제 결과로 집계된다.
- 사진 ZIP 미리보기 파일은 `<storage root>/<schoolCode>/tmp/candidate-photo-archives`에 임시 세션으로 저장되며, 학교 코드가 없을 때는 legacy `<storage root>/tmp/candidate-photo-archives`를 사용한다. 실제 반영 시 `previewToken`으로 재사용된 뒤 삭제된다.

## 삭제와 파일 정합성

- PDF/사진 삭제는 DB transaction 이후 파일 시스템에서 별도 수행된다.
- 삭제 결과에는 실제 삭제 파일 수와 이미 없는 파일 수가 함께 집계된다.
- 따라서 DB 삭제 성공 후 파일 누락이 있어도 결과 payload에서 `missing*Files`로 확인할 수 있다.
