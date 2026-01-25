import { useSearchParams } from "react-router-dom";
import { Box, Card, CardContent, Typography } from "@mui/material";
import EmailForm from "../components/account/EmailForm";
// import api from "../api";

export default function ForgotPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
      <EmailForm />
    </Box>
  );
}
