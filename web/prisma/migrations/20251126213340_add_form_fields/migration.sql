-- CreateTable
CREATE TABLE "FormField" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "formId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "isOcrField" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "placeholder" TEXT,
    "helpText" TEXT,
    "defaultValue" TEXT,
    "options" JSONB,
    "config" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadFieldValue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leadId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadFieldValue_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeadFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_key_key" ON "FormField"("formId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "LeadFieldValue_leadId_fieldId_key" ON "LeadFieldValue"("leadId", "fieldId");
