import { Box, Typography, TextField } from "@mui/material";

export default function RenderTextField({
  editMode,
  formik,
  fieldName,
  label,
  type = "text",
}) {
  if (!editMode) {
    return (
      <Box>
        <Typography variant="subtitle2" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="body2">
          {formik.values[fieldName] || "---"}
        </Typography>
      </Box>
    );
  }

  const isMultiline =
    fieldName === "aiSummary" ||
    fieldName === "clinicNotes" ||
    fieldName === "overrideSummary" ||
    fieldName === "caseResolutionReason";

  return (
    <TextField
      fullWidth
      label={label}
      name={fieldName}
      type={type}
      value={formik.values[fieldName]}
      onChange={formik.handleChange}
      error={formik.touched[fieldName] && Boolean(formik.errors[fieldName])}
      helperText={formik.touched[fieldName] && formik.errors[fieldName]}
      multiline={isMultiline}
    />
  );
}
