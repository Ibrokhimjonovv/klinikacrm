import React, { useState } from 'react';
import s from "./PatientProfile.module.scss";
import { useAppContext } from '../../../context/context';
import Modal from '../../../components/Modal/Modal';
import EditProfile from '../../../components/shared/EditProfile/EditProfile';

const PatientProfile = () => {
  const [editOpen, setEditOpen] = useState(false);

  const { user, patientCounts } = useAppContext();

  const patient = user?.patient;

  return (
    <div className={s.ProfilePage}>

      <div className={s.ProfileHeader}>
        <div className={s.ProfileInfo}>
          <div className={s.Avatar}>
            {patient?.first_name?.[0] || "D"}
          </div>

          <div>
            <h1>
              {patient?.first_name} {patient?.last_name}
            </h1>

            <p>Bemor</p>
          </div>
        </div>

        <button
          className={s.EditBtn}
          onClick={() => setEditOpen(true)}
        >
          <i className="bi bi-pencil-square"></i>
          Profilni tahrirlash
        </button>
      </div>

      <div className={s.StatsGrid}>

        <div className={s.StatCard}>
          <i className="bi bi-activity"></i>
          <h2>{patientCounts?.process || 0}</h2>
          <span>Jarayondagi davolanishlar</span>
        </div>

        <div className={s.StatCard}>
          <i className="bi bi-check-circle-fill"></i>
          <h2>{patientCounts?.done || 0}</h2>
          <span>Yakunlangan davolashlar</span>
        </div>
      </div>

      <div className={s.InfoSection}>

        <div className={s.InfoCard}>
          <h3>
            <i className="bi bi-person-vcard"></i>
            Shaxsiy ma'lumotlar
          </h3>

          <div className={s.InfoRow}>
            <span>F.I.O</span>
            <p>
              {patient?.last_name} {patient?.first_name} {patient?.middle_name}
            </p>
          </div>
        </div>

        <div className={s.InfoCard}>
          <h3>
            <i className="bi bi-telephone"></i>
            Aloqa ma'lumotlari
          </h3>

          <div className={s.InfoRow}>
            <span>Telefon</span>
            <p>{patient?.contact_number || "-"}</p>
          </div>

          <div className={s.InfoRow}>
            <span>Manzil</span>
            <p>{patient?.address || "-"}</p>
          </div>

          {/* <div className={s.InfoRow}>
                        <span>Login</span>
                        <p>{user?.username}</p>
                    </div>

                    <div className={s.InfoRow}>
                        <span>Rol</span>
                        <p>Shifokor</p>
                    </div> */}
        </div>

      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
      >
        <EditProfile
          role="patient"
          title="Profilni tahrirlash"
          subtitle="Shaxsiy ma'lumotlaringizni yangilang"
        />
      </Modal>

    </div>
  );
};

export default PatientProfile;