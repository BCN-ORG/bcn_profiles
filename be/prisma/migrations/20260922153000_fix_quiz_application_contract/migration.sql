DO $$
DECLARE
  quiz_app_id TEXT;
BEGIN
  SELECT "id" INTO quiz_app_id
  FROM "applications"
  WHERE "clientId" = 'bcn-quiz';

  IF quiz_app_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "applications"
    WHERE "code" = 'QUIZ' AND "id" <> quiz_app_id
  ) THEN
    RAISE EXCEPTION 'Cannot normalize bcn-quiz: application code QUIZ already belongs to another record';
  END IF;

  UPDATE "applications"
  SET
    "code" = 'QUIZ',
    "name" = 'BCN Quiz',
    "accessMode" = 'MEMBERS',
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = quiz_app_id;

  INSERT INTO "application_redirect_uris" ("id", "applicationId", "redirectUri")
  VALUES (
    quiz_app_id || '-uri-production',
    quiz_app_id,
    'https://quizzes.bcn.id.vn/api/auth/callback'
  )
  ON CONFLICT ("applicationId", "redirectUri") DO NOTHING;

  INSERT INTO "roles" ("id", "applicationId", "code", "name", "deprecated")
  VALUES
    (quiz_app_id || '-role-member', quiz_app_id, 'MEMBER', 'Member', false),
    (quiz_app_id || '-role-mentor', quiz_app_id, 'MENTOR', 'Mentor', false),
    (quiz_app_id || '-role-admin', quiz_app_id, 'ADMIN', 'Admin', false)
  ON CONFLICT ("applicationId", "code") DO UPDATE
  SET "name" = EXCLUDED."name", "deprecated" = false;

  INSERT INTO "permissions" ("id", "applicationId", "code", "description", "deprecated")
  VALUES
    (quiz_app_id || '-perm-question-read', quiz_app_id, 'quiz.question.read', 'Read quiz questions / take quizzes', false),
    (quiz_app_id || '-perm-question-create', quiz_app_id, 'quiz.question.create', 'Create questions', false),
    (quiz_app_id || '-perm-question-update', quiz_app_id, 'quiz.question.update', 'Update questions', false),
    (quiz_app_id || '-perm-question-delete', quiz_app_id, 'quiz.question.delete', 'Delete questions', false),
    (quiz_app_id || '-perm-result-read', quiz_app_id, 'quiz.result.read', 'Read own results', false)
  ON CONFLICT ("applicationId", "code") DO UPDATE
  SET "description" = EXCLUDED."description", "deprecated" = false;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT role."id", permission."id"
  FROM "roles" role
  JOIN "permissions" permission ON permission."applicationId" = quiz_app_id
  WHERE role."applicationId" = quiz_app_id
    AND (
      (role."code" = 'MEMBER' AND permission."code" IN ('quiz.question.read', 'quiz.result.read')) OR
      (role."code" = 'MENTOR' AND permission."code" IN ('quiz.question.read', 'quiz.question.create', 'quiz.question.update', 'quiz.result.read')) OR
      (role."code" = 'ADMIN' AND permission."code" IN ('quiz.question.read', 'quiz.question.create', 'quiz.question.update', 'quiz.question.delete', 'quiz.result.read'))
    )
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
END $$;
