ALTER TABLE "users" ADD COLUMN "title" TEXT;

ALTER TABLE "tasks" ADD COLUMN "effortHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "users" ADD CONSTRAINT "users_title_check" CHECK (
  "title" IS NULL OR "title" IN (
    'Software Developer',
    'Software Associate',
    'DevOps Engineer',
    'QA Engineer',
    'UI/UX Designer',
    'Product Manager',
    'Project Manager',
    'Business Analyst',
    'Intern'
  )
);
