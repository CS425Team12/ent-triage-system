import React from "react";
import { Chip, IconButton } from "@mui/material";
import { Edit } from "@mui/icons-material";
import dayjs from "dayjs";
import { URGENCY_PRIORITY, URGENCY_LABELS } from "../utils/consts";
import { URGENCY_COLORS } from "../theme";
import CaseDetailsDialog from "../components/caseDetails/CaseDetailsDialog";
import EditUserDialog from "../components/admin/EditUserDialog";
import { useTriageCases } from "../context/TriageCaseContext";
import { userService } from "../api/userService";
import { toast } from "../utils/toast";

export const UrgencyCellRenderer = (params) => {
  if (!params.value) return null;

  const label = URGENCY_LABELS[params.value];
  const color = URGENCY_COLORS[params.value];

  return (
    <Chip
      label={label}
      size="medium"
      sx={{
        backgroundColor: color,
        color: "white",
        fontWeight: "bold",
        fontSize: "0.75rem",
      }}
    />
  );
};

export const EditCaseButtonCellRenderer = (params) => {
  const [open, setOpen] = React.useState(false);
  const { updateCase, resolveCase } = useTriageCases();
  const caseData = params.data;

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async (updatedData) => {
    if (Object.keys(updatedData).length === 0) return;
    console.log(updatedData)
    const isResolving = Boolean(updatedData.resolutionReason);
    try {
      if (isResolving) {
        await resolveCase(caseData.caseID, {
          resolutionReason: updatedData.resolutionReason,
        });
      } else {
        await updateCase(caseData.caseID, updatedData);
      }
      toast.success(
        `Successfully ${isResolving ? "resolved" : "updated"} case`
      );
    } catch (err) {
      toast.error("Failed to update case.");
      console.error("Failed to update case", err);
    }
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="medium">
        <Edit />
      </IconButton>
      <CaseDetailsDialog
        open={open}
        onClose={handleClose}
        caseData={caseData}
        onSave={handleSave}
      />
    </>
  );
};

export const EditUserButtonCellRenderer = (params) => {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const userData = params.data;

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async (updatedData) => {
    if (Object.keys(updatedData).length === 0) return;
    console.log("Saving with data: ", updatedData);
    setSaving(true);
    try {
      await userService.updateUser(userData.userID, updatedData);
      params.onUserUpdated?.(); //refresh user grid after update
      handleClose();
      toast.success(`Successfully updated user.`);
    } catch (err) {
      toast.error(`Failed to update user.`);
      console.log(
        "Failed to update user: " + (err.message || "Unknown error")
      );
    }
    setSaving(false);
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="medium">
        <Edit />
      </IconButton>
      <EditUserDialog
        open={open}
        onClose={handleClose}
        userData={userData}
        onSave={handleSave}
      />
    </>
  );
};

export const ageValueGetter = (dob) => {
  if (!dob) return null;
  return dayjs().diff(dayjs(dob), "year");
};

export const dateTimeFormatter = (params) => {
  if (!params.value) return "-";
  return dayjs(params.value).format("h:mm A, MM/DD/YYYY");
};

export const urgencyComparator = (a, b) => {
  return URGENCY_PRIORITY[a] - URGENCY_PRIORITY[b];
};
