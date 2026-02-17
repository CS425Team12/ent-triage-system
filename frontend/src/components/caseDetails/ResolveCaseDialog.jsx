import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../context/AuthContext";
export default function ResolveCaseDialog({ open, onClose, onResolve }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      resolutionReason: "",
      resolvedBy: user.email,
    },
    validationSchema: Yup.object({
      resolutionReason: Yup.string().required("Resolution reason is required"),
    }),
    onSubmit: async (values) => {
      setSubmitting(true);
      await onResolve({
        resolutionReason: values.resolutionReason, // api will autofill resolvedBy field
      });
      setSubmitting(false);
      formik.resetForm();
      console.log("Resolution Details: ", values);
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography sx={{ fontWeight: 600 }}>
          Please Enter Resolution Details
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <form onSubmit={formik.handleSubmit}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              multiline
              rows={4}
              name="resolutionReason"
              label="Resolution Reason"
              placeholder="Describe the resolution..."
              value={formik.values.resolutionReason}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={Boolean(
                formik.touched.resolutionReason &&
                  formik.errors.resolutionReason
              )}
              helperText={
                formik.touched.resolutionReason &&
                formik.errors.resolutionReason
              }
            />
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Resolved By
              </Typography>
              <Typography variant="body1" color="text.primary">
                {user.email}
              </Typography>
            </Box>
          </Stack>
        </form>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button disabled={submitting} onClick={formik.handleSubmit} variant="contained">
          Resolve
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
