import React from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import RenderSelectField from "../fields/RenderSelectField";
import { toast } from "../../utils/toast";
import { calendarManagementService } from "../../api/calendarService";
import { userService } from "../../api/userService";
import { STATUS_VALUES } from "../../utils/consts";

const fmtTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const addMinutes = (time, mins) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
];

export const ScheduleTab = ({
  caseID,
  caseStatus,
  scheduledDate,
  activeAppointmentID,
  onSave,
  onSuccess,
  onClose,
}) => {
  const [physicians, setPhysicians] = React.useState([]);
  const [appointment, setAppointment] = React.useState(null);
  const [loadingAppointment, setLoadingAppointment] = React.useState(false);

  const [reviewReason, setReviewReason] = React.useState("");
  const [scheduleAppt, setScheduleAppt] = React.useState(false);
  const [physicianID, setPhysicianID] = React.useState("");
  const [appointmentDate, setAppointmentDate] = React.useState(null);
  const [appointmentTime, setAppointmentTime] = React.useState("");
  const [durationMins, setDurationMins] = React.useState(30);
  const [slots, setSlots] = React.useState([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [showCancelForm, setShowCancelForm] = React.useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = React.useState(false);

  const isUnreviewed = caseStatus !== STATUS_VALUES.REVIEWED;
  const hasAppointment = !!appointment;

  React.useEffect(() => {
    const loadPhysicians = async () => {
      try {
        const results = await userService.getAllUsers();
        setPhysicians(results.data.filter((u) => u.role === "physician"));
      } catch {
        toast.error("Could not load physicians");
      }
    };
    loadPhysicians();
  }, []);

  React.useEffect(() => {
    if (!activeAppointmentID) return;
    const loadAppointment = async () => {
      setLoadingAppointment(true);
      try {
        const data =
          await calendarManagementService.getAppointmentById(
            activeAppointmentID,
          );
        setAppointment(data);
      } catch {
        toast.error("Could not load appointment");
      } finally {
        setLoadingAppointment(false);
      }
    };
    loadAppointment();
  }, [activeAppointmentID]);

  const loadSlots = React.useCallback(async (pid, date) => {
    if (!pid || !date) return;
    setLoadingSlots(true);
    setSlots([]);
    try {
      const data = await calendarManagementService.getAvailability(
        pid,
        dayjs(date).format("YYYY-MM-DD"),
      );
      setSlots(data.slots);
    } catch {
      toast.error("Could not load available times");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const blocksNeeded = Math.ceil(durationMins / 30);

  const availableSlots = React.useMemo(() => {
    return slots.filter((slot, index) => {
      if (!slot.available) return false;
      for (let i = 1; i < blocksNeeded; i++) {
        if (!slots[index + i]?.available) return false;
      }
      return true;
    });
  }, [slots, blocksNeeded]);

  const handlePhysicianChange = (e) => {
    const id = e.target.value;
    setPhysicianID(id);
    setAppointmentTime("");
    loadSlots(id, appointmentDate);
  };

  const handleDateChange = (newValue) => {
    setAppointmentDate(newValue);
    setAppointmentTime("");
    loadSlots(physicianID, newValue);
  };

  const handleDurationChange = (mins) => {
    setDurationMins(mins);
    setAppointmentTime("");
  };

  const handleToggleSchedule = (e) => {
    setScheduleAppt(e.target.checked);
    setPhysicianID("");
    setAppointmentDate(null);
    setAppointmentTime("");
    setDurationMins(30);
    setSlots([]);
  };

  const handleToggleReschedule = (e) => {
    setShowRescheduleForm(e.target.checked);
    setPhysicianID("");
    setAppointmentDate(null);
    setAppointmentTime("");
    setDurationMins(30);
    setSlots([]);
  };

  const canSubmitReview = isUnreviewed
    ? !!reviewReason &&
      (!scheduleAppt ||
        (!!physicianID && !!appointmentDate && !!appointmentTime))
    : false;

  const canSubmitSchedule =
    !isUnreviewed && !hasAppointment
      ? !!physicianID && !!appointmentDate && !!appointmentTime
      : false;

  const canSubmitReschedule =
    showRescheduleForm &&
    !!physicianID &&
    !!appointmentDate &&
    !!appointmentTime;

  const canSubmitCancel = showCancelForm;

  const submitLabelReview =
    scheduleAppt && physicianID && appointmentDate && appointmentTime
      ? "Submit Review & Schedule"
      : "Submit Review";

  const handleSubmitReview = async () => {
    if (!canSubmitReview) return;
    setSubmitting(true);
    try {
      if (scheduleAppt && physicianID && appointmentDate && appointmentTime) {
        const dateStr = dayjs(appointmentDate).format("YYYY-MM-DD");
        const endTime = addMinutes(appointmentTime, durationMins);
        const scheduledAt = `${dateStr}T${appointmentTime}:00`;
        const scheduledEnd = `${dateStr}T${endTime}:00`;
        await calendarManagementService.createAppointment({
          caseID,
          physicianID,
          scheduledAt,
          scheduledEnd,
        });
      }
      await onSave({ reviewReason, caseID });
      onSuccess();
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSchedule = async () => {
    if (!canSubmitSchedule) return;
    setSubmitting(true);
    try {
      const dateStr = dayjs(appointmentDate).format("YYYY-MM-DD");
      const endTime = addMinutes(appointmentTime, durationMins);
      const scheduledAt = `${dateStr}T${appointmentTime}:00`;
      const scheduledEnd = `${dateStr}T${endTime}:00`;
      await calendarManagementService.createAppointment({
        caseID,
        physicianID,
        scheduledAt,
        scheduledEnd,
      });
      toast.success("Appointment scheduled");
      onSuccess();
    } catch {
      toast.error("Failed to schedule appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReschedule = async () => {
    if (!canSubmitReschedule) return;
    setSubmitting(true);
    try {
      const dateStr = dayjs(appointmentDate).format("YYYY-MM-DD");
      const endTime = addMinutes(appointmentTime, durationMins);
      const scheduledAt = `${dateStr}T${appointmentTime}:00`;
      const scheduledEnd = `${dateStr}T${endTime}:00`;
      await calendarManagementService.rescheduleAppointment(
        activeAppointmentID,
        {
          scheduledAt,
          scheduledEnd,
          ...(physicianID !== appointment?.physicianID && { physicianID }),
        },
      );
      toast.success("Appointment rescheduled");
      onSuccess();
    } catch {
      toast.error("Failed to reschedule appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCancel = async () => {
    setSubmitting(true);
    try {
      await calendarManagementService.cancelAppointment(
        activeAppointmentID,
        cancelReason || null,
      );
      toast.success("Appointment cancelled");
      onSuccess();
    } catch {
      toast.error("Failed to cancel appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPhysician = physicians.find((p) => p.userID === physicianID);

  const schedulingForm = (
    <Box display="flex" flexDirection="column" gap={2}>
      <FormControl fullWidth>
        <InputLabel>{"Physician"}</InputLabel>
        <Select
          value={physicianID}
          onChange={handlePhysicianChange}
          label={"Physician"}
        >
          {physicians.map((p) => (
            <MenuItem key={p.userID} value={p.userID} disabled={!p.calendarID}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Dr. {p.firstName} {p.lastName}
                  </Typography>
                </Box>
                {!p.calendarID && (
                  <Typography
                    variant="caption"
                    sx={{ ml: 2, fontStyle: "italic" }}
                  >
                    Calendar has not been configured.
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <DatePicker
        label="Appointment Date"
        value={appointmentDate}
        onChange={handleDateChange}
        disablePast
        slotProps={{ textField: { fullWidth: true } }}
      />
      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
          Duration
        </Typography>
        <Box display="flex" flexDirection="row" gap={1} flexWrap="wrap">
          {DURATIONS.map((d) => (
            <Chip
              key={d.value}
              label={d.label}
              onClick={() => handleDurationChange(d.value)}
              color={durationMins === d.value ? "primary" : "default"}
              variant={durationMins === d.value ? "filled" : "outlined"}
              size="small"
              sx={{ fontWeight: 500, cursor: "pointer" }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );

  const availabilityPanel = (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h8" sx={{ fontWeight: 600 }}>
        Available Times
      </Typography>
      {!physicianID || !appointmentDate ? (
        <Typography variant="body2" color="textSecondary">
          Select a physician and date to see availability.
        </Typography>
      ) : loadingSlots ? (
        <Typography variant="body2" color="textSecondary">
          Checking availability...
        </Typography>
      ) : availableSlots.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No available times for this date and duration.
        </Typography>
      ) : (
        <Box display="flex" flexDirection="row" gap={1} flexWrap="wrap">
          {availableSlots.map((slot) => (
            <Chip
              key={slot.time}
              label={fmtTime(slot.time)}
              onClick={() => setAppointmentTime(slot.time)}
              color={appointmentTime === slot.time ? "primary" : "default"}
              variant={appointmentTime === slot.time ? "filled" : "outlined"}
              size="small"
              sx={{ cursor: "pointer", fontWeight: 500 }}
            />
          ))}
        </Box>
      )}
      {selectedPhysician && appointmentDate && appointmentTime && (
        <Box>
          <Typography variant="subtitle2" color="textSecondary">
            Selected Appointment
          </Typography>
          <Typography variant="body2">
            Dr. {selectedPhysician.firstName} {selectedPhysician.lastName}
            {" · "}
            {dayjs(appointmentDate).format("MM/DD/YYYY")}
            {" at "}
            {fmtTime(appointmentTime)}
            {" · "}
            {DURATIONS.find((d) => d.value === durationMins)?.label}
          </Typography>
        </Box>
      )}
    </Box>
  );

  // ─── UNREVIEWED ───────────────────────────────────────────────────────────────
  if (isUnreviewed) {
    return (
      <Box display="flex" flexDirection="column" gap={3}>
        <Grid container spacing={4}>
          <Grid>
            <Typography variant="h8" sx={{ fontWeight: 600 }}>
              Review Details
            </Typography>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Review Reason *"
                placeholder="Describe the review..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={scheduleAppt}
                    onChange={handleToggleSchedule}
                  />
                }
                label={
                  <Typography variant="body2">
                    Schedule an appointment
                  </Typography>
                }
              />
              {scheduleAppt && schedulingForm}
            </Box>
          </Grid>
          {scheduleAppt && availabilityPanel}
        </Grid>
        <Divider />
        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="contained"
            disabled={!canSubmitReview || submitting}
            onClick={handleSubmitReview}
            startIcon={
              submitting ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {submitting ? "Submitting..." : submitLabelReview}
          </Button>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  // ─── REVIEWED — HAS APPOINTMENT ───────────────────────────────────────────────
  if (hasAppointment) {
    return (
      <Box display="flex" flexDirection="column" gap={3}>
        <Grid container spacing={4}>
          <Grid>
            <Typography variant="h8" sx={{ fontWeight: 600 }}>
              Scheduled Appointment
            </Typography>
            {loadingAppointment ? (
              <Box mt={2}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <Box mt={2} display="flex" flexDirection="column" gap={1}>
                <Typography variant="subtitle2" color="textSecondary">
                  Physician
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {appointment.physicianName}
                </Typography>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mt: 1 }}
                >
                  Date & Time
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {dayjs(appointment.scheduledAt).format("ddd, MMM D YYYY")}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {dayjs(appointment.scheduledAt).format("h:mm A")}
                  {" — "}
                  {dayjs(appointment.scheduledEnd).format("h:mm A")}
                  {" · "}
                  {appointment.durationMins} min
                </Typography>
              </Box>
            )}
            <Box mt={3} display="flex" flexDirection="column" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showRescheduleForm}
                    onChange={handleToggleReschedule}
                    disabled={showCancelForm}
                  />
                }
                label={<Typography variant="body2">Reschedule</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showCancelForm}
                    onChange={(e) => {
                      setShowCancelForm(e.target.checked);
                      setShowRescheduleForm(false);
                    }}
                    disabled={showRescheduleForm}
                  />
                }
                label={
                  <Typography variant="body2">Cancel appointment</Typography>
                }
              />
              {showCancelForm && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Cancel Reason (Optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          </Grid>
          {showRescheduleForm && (
            <Box
              sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography variant="h8" sx={{ fontWeight: 600 }}>
                New Time
              </Typography>
              <Box mt={2}>{schedulingForm}</Box>
            </Box>
          )}
          {showRescheduleForm && availabilityPanel}
        </Grid>
        <Divider />
        <Box display="flex" justifyContent="flex-end" gap={1}>
          {showCancelForm && (
            <Button
              variant="contained"
              color="error"
              disabled={submitting}
              onClick={handleSubmitCancel}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
            >
              {submitting ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          )}
          {showRescheduleForm && (
            <Button
              variant="contained"
              disabled={!canSubmitReschedule || submitting}
              onClick={handleSubmitReschedule}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
            >
              {submitting ? "Rescheduling..." : "Reschedule Appointment"}
            </Button>
          )}
          <Button onClick={onClose} disabled={submitting}>
            Close
          </Button>
        </Box>
      </Box>
    );
  }

  // ─── REVIEWED — NO APPOINTMENT ────────────────────────────────────────────────
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Grid container spacing={4}>
        <Grid>
          <Typography variant="h8" sx={{ fontWeight: 600 }}>
            Appointment Details
          </Typography>
          <Box mt={2}>{schedulingForm}</Box>
        </Grid>
        {availabilityPanel}
      </Grid>
      <Divider />
      <Box display="flex" justifyContent="flex-end" gap={1}>
        <Button
          variant="contained"
          disabled={!canSubmitSchedule || submitting}
          onClick={handleSubmitSchedule}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {submitting ? "Scheduling..." : "Schedule Appointment"}
        </Button>
        <Button onClick={onClose} disabled={submitting}>
          Close
        </Button>
      </Box>
    </Box>
  );
};
