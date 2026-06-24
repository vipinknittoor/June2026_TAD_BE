ALTER TABLE "refresh_tokens" ADD COLUMN "accessTokenId" TEXT;

CREATE UNIQUE INDEX "refresh_tokens_accessTokenId_key" ON "refresh_tokens"("accessTokenId");
