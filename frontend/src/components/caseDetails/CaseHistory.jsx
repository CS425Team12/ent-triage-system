import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Chip,
  Paper,
  Stack,
  Autocomplete,
  TextField,
  Button,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import { useTriageCases } from "../../context/TriageCaseContext";
import { usePatients } from "../../context/PatientContext";
import {
  FIELD_LABELS,
  URGENCY_LABELS,
  STATUS_LABELS,
  RETURNING_PATIENT_OPTIONS,
} from "../../utils/consts";
import dayjs from "dayjs";
import { stringToBool } from "../../utils/utils";

const HISTORY_VIEWS = {
  COMBINED: "combined",
  CASE: "case",
  PATIENT: "patient",
};

export const CaseHistory = ({ caseId, patientId }) => {
  const [historyView, setHistoryView] = useState(HISTORY_VIEWS.COMBINED);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);

  const { fetchCaseChangelog } = useTriageCases();
  const { fetchPatientChangelog } = usePatients();

  useEffect(() => {
    if (caseId && patientId) {
      loadHistory();
    }
  }, [caseId, patientId]);

  const loadHistory = async () => {
    if (!caseId || !patientId) return;
    try {
      const [caseHistory, patientHistory] = await Promise.all([
        fetchCaseChangelog(caseId),
        fetchPatientChangelog(patientId),
      ]);

      const caseEntries = caseHistory.map((entry) => ({
        ...entry,
        source: HISTORY_VIEWS.CASE,
        entityType: "Case Details",
      }));

      const patientEntries = patientHistory.map((entry) => ({
        ...entry,
        source: HISTORY_VIEWS.PATIENT,
        entityType: "Patient",
      }));

      const combined = [...caseEntries, ...patientEntries].sort(
        (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
      );

      setHistory(combined);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryViewChange = (event, newView) => {
    if (newView !== null) {
      setHistoryView(newView);
    }
  };

  const getDisplayLabel = (fieldName) => {
    return FIELD_LABELS[fieldName] || fieldName;
  };

  const getDisplayValue = (fieldName, value) => {
    if (fieldName === "overrideUrgency" || fieldName === "AIUrgency") {
      return URGENCY_LABELS[value] || value;
    }

    if (fieldName === "status") {
      return STATUS_LABELS[value] || value;
    }

    if (typeof value === "string" && Date.parse(value)) {
      return dayjs(value).format("h:mm A, MM/DD/YYYY");
    }

    if (fieldName === "returningPatient") {
      const val = stringToBool(value);
      const option = RETURNING_PATIENT_OPTIONS.find((o) => o.value === val);
      return option ? option.label : value;
    }

    return value || "(empty)";
  };

  const availableUsers = useMemo(() => {
    const users = new Set(history.map((entry) => entry.changedByEmail));
    return Array.from(users).sort();
  }, [history]);

  const availableFields = useMemo(() => {
    const fields = new Set(history.map((entry) => entry.fieldName));
    return Array.from(fields)
      .map((fieldName) => ({
        value: fieldName,
        label: getDisplayLabel(fieldName),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      if (historyView !== "combined" && entry.source !== historyView) {
        return false;
      }
      if (
        selectedUsers.length > 0 &&
        !selectedUsers.includes(entry.changedByEmail)
      ) {
        return false;
      }
      if (
        selectedFields.length > 0 &&
        !selectedFields.includes(entry.fieldName)
      ) {
        return false;
      }
      return true;
    });
  }, [history, historyView, selectedUsers, selectedFields]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h8" sx={{ fontWeight: 600 }}>
            Change History
          </Typography>
          <ToggleButtonGroup
            value={historyView}
            exclusive
            onChange={handleHistoryViewChange}
            size="small"
          >
            <ToggleButton value={HISTORY_VIEWS.COMBINED}>
              All Changes
            </ToggleButton>
            <ToggleButton value={HISTORY_VIEWS.CASE}>Case Only</ToggleButton>
            <ToggleButton value={HISTORY_VIEWS.PATIENT}>
              Patient Only
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          mb={2}
          spacing={2}
        >
          <Autocomplete
            multiple
            size="small"
            options={availableUsers}
            value={selectedUsers}
            onChange={(event, newValue) => setSelectedUsers(newValue)}
            renderInput={(params) => <TextField {...params} label="User" />}
            slotProps={{
              popper: {
                style: {
                  width: "fit-content",
                },
              },
            }}
          />
          <Autocomplete
            multiple
            size="small"
            options={availableFields.map((f) => f.value)}
            value={selectedFields}
            onChange={(event, newValue) => setSelectedFields(newValue)}
            getOptionLabel={(option) => {
              const field = availableFields.find((f) => f.value === option);
              return field ? field.label : option;
            }}
            renderInput={(params) => <TextField {...params} label="Field" />}
            slotProps={{
              popper: {
                style: {
                  width: "fit-content",
                },
              },
            }}
          />
        </Stack>
        {(selectedUsers.length > 0 || selectedFields.length > 0) && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
            mb={2}
          >
            <Typography variant="body2" color="text.secondary">
              Showing {filteredHistory.length} of {history.length}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSelectedUsers([]);
                setSelectedFields([]);
              }}
            >
              Clear Filters
            </Button>
          </Stack>
        )}
      </Stack>
      {filteredHistory.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            No change history available
          </Typography>
        </Box>
      ) : (
        <Timeline position="right">
          {filteredHistory.map((entry, index) => (
            <TimelineItem key={entry.id}>
              <TimelineOppositeContent
                color="text.secondary"
                sx={{ flex: 0.15, minWidth: 100 }}
              >
                <Typography variant="caption">
                  {dayjs(entry.changedAt).format("MMM D, YYYY")}
                </Typography>
                <Typography variant="caption" display="block">
                  {dayjs(entry.changedAt).format("h:mm A")}
                </Typography>
              </TimelineOppositeContent>

              <TimelineSeparator>
                <TimelineDot color={"primary"} />
                {index < filteredHistory.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent sx={{ flex: 1 }}>
                <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Stack>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {entry.changedByEmail}
                        </Typography>
                      </Stack>
                      <Chip
                        label={entry.entityType}
                        size="small"
                        color={"primary"}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Field:{" "}
                      <Typography
                        variant="body2"
                        sx={{
                          bgcolor: "grey.100",
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontWeight: 600,
                        }}
                      >
                        {getDisplayLabel(entry.fieldName)}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Before:{" "}
                      <Typography
                        variant="body2"
                        sx={{
                          bgcolor: "grey.100",
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.5,
                        }}
                      >
                        {getDisplayValue(entry.fieldName, entry.oldValue)}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      After:{" "}
                      <Typography
                        variant="body2"
                        sx={{
                          bgcolor: "grey.100",
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.5,
                        }}
                      >
                        {getDisplayValue(entry.fieldName, entry.newValue)}
                      </Typography>
                    </Typography>
                  </Stack>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </Box>
  );
};
