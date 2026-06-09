-- CreateTable
CREATE TABLE "budget" (
    "budget_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "threshold" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("budget_id")
);

-- CreateTable
CREATE TABLE "detail_transaction" (
    "detail_transaction_id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "name_items" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "detail_transaction_pkey" PRIMARY KEY ("detail_transaction_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "name_category" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "laporan" (
    "laporan_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "report_date" DATE NOT NULL,
    "file_url" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laporan_pkey" PRIMARY KEY ("laporan_id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "transaction_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" INTEGER NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "date" DATE NOT NULL,
    "foto_struk" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "profile_picture" TEXT,
    "fcm_token" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_user_id_key" ON "budget"("user_id");

-- CreateIndex
CREATE INDEX "idx_budget_user_id" ON "budget"("user_id");

-- CreateIndex
CREATE INDEX "idx_detail_transaction_transaction_id" ON "detail_transaction"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_laporan_user_id" ON "laporan"("user_id");

-- CreateIndex
CREATE INDEX "idx_transaction_date" ON "transaction"("date");

-- CreateIndex
CREATE INDEX "idx_transaction_category_id" ON "transaction"("category_id");

-- CreateIndex
CREATE INDEX "idx_transaction_user_id" ON "transaction"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- AddForeignKey
ALTER TABLE "budget" ADD CONSTRAINT "budget_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detail_transaction" ADD CONSTRAINT "detail_transaction_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("transaction_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
