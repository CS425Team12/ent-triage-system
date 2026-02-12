CREATE SCHEMA IF NOT EXISTS ent;
SET search_path TO ent, public;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level_enum') THEN
        CREATE TYPE urgency_level_enum AS ENUM ('low', 'medium', 'high');
    END IF;
END$$;

SET search_path TO ent, public;

CREATE TABLE "User" (
    "userID"       UUID PRIMARY KEY,
    "firstName"    TEXT NOT NULL,
    "role"         TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastLogin"    DATE,
    "lastName"     TEXT NOT NULL,
    "email"        TEXT UNIQUE
);

CREATE TABLE "Patient" (
    "patientID"          UUID PRIMARY KEY,
    "firstName"          TEXT NOT NULL,
    "DOB"                DATE,
    "contactInfo"        TEXT,
    "insuranceInfo"      TEXT,
    "returningPatient"   BOOLEAN DEFAULT FALSE,
    "languagePreference" TEXT,
    "verified"           BOOLEAN DEFAULT FALSE,
    "lastName"           TEXT NOT NULL
);

CREATE TABLE "TriageCase" (
    "caseID"              UUID PRIMARY KEY,
    "patientID"           UUID NOT NULL,
    "transcript"          TEXT,
    "AIConfidence"        DOUBLE PRECISION,
    "AISummary"           TEXT,
    "status"              TEXT,
    "dateCreated"         DATE DEFAULT CURRENT_DATE,
    "createdBy"           UUID,
    "resolutionReason"    TEXT,
    "resolutionTimestamp" TIMESTAMPTZ,
    "resolvedBy"          UUID,
    "overrideSummary"     TEXT,
    "AIUrgency"           urgency_level_enum,
    "overrideUrgency"     urgency_level_enum,
    "clinicianSummary"    TEXT,
    CONSTRAINT fk_triage_patient
        FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE CASCADE,
    CONSTRAINT fk_triage_created_by
        FOREIGN KEY ("createdBy") REFERENCES "User"("userID"),
    CONSTRAINT fk_triage_resolved_by
        FOREIGN KEY ("resolvedBy") REFERENCES "User"("userID")
);

CREATE TABLE "MedicalIdentifiers" (
    "medicalID" UUID PRIMARY KEY,
    "patientID" UUID NOT NULL,
    "idType"    TEXT NOT NULL,
    "idValue"   TEXT NOT NULL,
    "source"    TEXT,
    "verified"  BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_medical_patient
        FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE CASCADE
);

CREATE TABLE "Transcript" (
    "transcriptID"      UUID PRIMARY KEY,
    "caseID"            UUID NOT NULL,
    "rawText"           TEXT,
    "entitiesExtracted" JSONB,
    "savedAt"           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_transcript_case
        FOREIGN KEY ("caseID") REFERENCES "TriageCase"("caseID") ON DELETE CASCADE
);

CREATE TABLE "AIInference" (
    "inferenceID"     UUID PRIMARY KEY,
    "caseID"          UUID NOT NULL,
    "inputText"       TEXT,
    "modelName"       TEXT,
    "modelVersion"    TEXT,
    "outputText"      TEXT,
    "confidenceScore" DECIMAL,
    "timestamp"       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_aiinference_case
        FOREIGN KEY ("caseID") REFERENCES "TriageCase"("caseID") ON DELETE CASCADE
);

CREATE TABLE "AuditLog" (
    "logID"         UUID PRIMARY KEY,
    "actorID"        UUID,
    "actorType"      TEXT,
    "resourceID"        UUID,
    "resourceType"      TEXT,
    "action"            TEXT,
    "status"            TEXT,
    "timestamp"     TIMESTAMPTZ DEFAULT NOW(),
    "changeDetails" JSONB,
    "ipAddress"    INET,
    "hash"          TEXT,
    "previousHash"  TEXT,
    CONSTRAINT fk_audit_user
        FOREIGN KEY ("actorID") REFERENCES "User"("userID")
);

CREATE INDEX idx_triage_patient   ON "TriageCase"("patientID");
CREATE INDEX idx_transcript_case  ON "Transcript"("caseID");
CREATE INDEX idx_aiinference_case ON "AIInference"("caseID");
CREATE INDEX idx_audit_resource       ON "AuditLog"("resourceID");

ALTER TYPE urgency_level_enum RENAME VALUE 'low' TO 'routine';
ALTER TYPE urgency_level_enum RENAME VALUE 'medium' TO 'semi-urgent';
ALTER TYPE urgency_level_enum RENAME VALUE 'high' TO 'urgent';

CREATE OR REPLACE FUNCTION ent.validate_audit_resource()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resourceType IS NULL OR NEW.resourceID IS NULL THEN
    RETURN NEW;
  END IF;

  IF upper(NEW.resourceType) = 'USER' THEN
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE "userID" = NEW.resourceID) THEN
      RAISE EXCEPTION 'AuditLog validation failed: resourceType USER but resourceID not found: %', NEW.resourceID;
    END IF;
  ELSIF upper(NEW.resourceType) = 'PATIENT' THEN
    IF NOT EXISTS (SELECT 1 FROM "Patient" WHERE "patientID" = NEW.resourceID) THEN
      RAISE EXCEPTION 'AuditLog validation failed: resourceType PATIENT but resourceID not found: %', NEW.resourceID;
    END IF;
  ELSIF upper(NEW.resourceType) = 'TRIAGE_CASE' THEN
    IF NOT EXISTS (SELECT 1 FROM "TriageCase" WHERE "caseID" = NEW.resourceID) THEN
      RAISE EXCEPTION 'AuditLog validation failed: resourceType TRIAGE_CASE but resourceID not found: %', NEW.resourceID;
    END IF;
  ELSE
    RAISE EXCEPTION 'AuditLog validation failed: unknown resourceType: %', NEW.resourceType;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_audit_resource
BEFORE INSERT OR UPDATE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION ent.validate_audit_resource();

CREATE INDEX IF NOT EXISTS idx_audit_resource ON "AuditLog"(resourceType, resourceID);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON "AuditLog"(timestamp);