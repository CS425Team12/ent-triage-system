import { createContext, useContext, useCallback } from "react";
import { patientService } from "../api/patientService";

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const fetchPatientById = useCallback(async (patientId) => {
    if (!patientId) return;
    return await patientService.getPatientById(patientId);
  }, []);

  const updatePatient = useCallback(async (patientId, updates) => {
    if (!patientId || !updates || Object.keys(updates).length === 0) return;
    const updatedPatient = await patientService.updatePatient(patientId, updates);
    return updatedPatient;
  }, []);

  const fetchPatientChangelog = useCallback(async (patientId) => {
    if (!patientId) return [];
    return await patientService.getPatientChangelog(patientId);
  }, []);

  const value = {
    fetchPatientById,
    updatePatient,
    fetchPatientChangelog,
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatients() {
  return useContext(PatientContext);
}