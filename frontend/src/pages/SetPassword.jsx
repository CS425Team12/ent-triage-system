import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import PasswordForm from "../components/account/PasswordForm";
import apiClient from "../api/axios";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await apiClient.post("/auth/set-password", {
        token,
        new_password: values.password,
      });

      console.log("Password set:", values.password);

      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
      <Card sx={{ width: 400, padding: 2 }}>
        <CardContent>
          {!success ? (
            <>
              <Typography variant="h5" fontWeight="bold" mb={2}>
                Set Your Password
              </Typography>

              <Typography variant="body2" mb={2}>
                Please enter your new password below.
              </Typography>

              <PasswordForm
                onSubmit={handleSubmit}
                submitLabel="Set Password"
              />
            </>
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 2,
                }}>
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 60, color: "success.main" }}
                />

                <Typography variant="h5" fontWeight="bold">
                  Password Set Successfully
                </Typography>

                <Typography variant="body2">
                  Your account is now ready. You can log in using your new
                  password.
                </Typography>

                <Button
                  variant="contained"
                  sx={{ mt: 2, borderRadius: 3 }}
                  onClick={() => navigate("/login")}>
                  Return to Login
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
