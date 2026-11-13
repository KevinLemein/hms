import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { SelectField } from "../../components/ui/Field";
import Alert from "../../components/ui/Alert";
import useDoctors from "../receptionist/useDoctors";
import DoctorSchedulePanel from "./DoctorSchedulePanel";

/** Front desk picks a doctor, then manages that doctor's working hours and time off. */
export default function DoctorSchedulesTab() {
    const doctors = useDoctors();
    const [doctorId, setDoctorId] = useState("");

    return (
        <div className="space-y-6">
            <Card className="max-w-md">
                <div className="px-5 py-5">
                    {doctors.error && <Alert tone="error" className="mb-3">Couldn't load the list of doctors. {doctors.error}</Alert>}
                    <SelectField
                        label="Doctor"
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        placeholder={doctors.loading ? "Loading doctors" : "Select a doctor"}
                        options={doctors.options}
                    />
                </div>
            </Card>
            {doctorId && <DoctorSchedulePanel key={doctorId} doctorId={doctorId} />}
        </div>
    );
}
