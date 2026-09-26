import React, { useState } from 'react';
import s from "./AssistantDoctorProfile.module.scss";
import { useAppContext } from '../../../context/context';
import Modal from '../../../components/Modal/Modal';
import EditProfile from '../../../components/shared/EditProfile/EditProfile';

const AssistantDoctorProfile = () => {
  const [editOpen, setEditOpen] = useState(false);

  const { user, doctorCounts } = useAppContext();

  const doctor = user?.doctor;

  return (
    <div className={s.ProfilePage}>

      <div className={s.ProfileHeader}>
        <div className={s.ProfileInfo}>
          <div className={s.Avatar}>
            {doctor?.profile_image ? (
              <img src={doctor.profile_image} alt={`${doctor?.first_name || ''} ${doctor?.last_name || ''}`} />
            ) : (
              doctor?.first_name?.[0] || "D"
            )}
          </div>

          <div>
            <h1>
              {doctor?.first_name} {doctor?.last_name}
            </h1>

            <p>{doctor?.department_detail?.name}</p>
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
          <h2>{doctorCounts?.process || 0}</h2>
          <span>Jarayondagi bemorlar</span>
        </div>

        <div className={s.StatCard}>
          <i className="bi bi-check-circle-fill"></i>
          <h2>{doctorCounts?.completed || 0}</h2>
          <span>Yakunlangan davolashlar</span>
        </div>

        <div className={s.StatCard}>
          {/* <i className="bi bi-people-fill"></i> */}
          {/* <h2>{doctorCounts?.all || 0}</h2>
                    <span>Jami bemorlar</span> */}
          <i className="bi bi-award-fill"></i>
          <h2>{doctor?.experience_years}+ yil</h2>
          <span>Tajriba</span>
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
              {doctor?.last_name} {doctor?.first_name} {doctor?.middle_name}
            </p>
          </div>

          <div className={s.InfoRow}>
            <span>Mutaxassislik</span>
            <p>{doctor?.department_detail?.name}</p>
          </div>

          {/* <div className={s.InfoRow}>
            <span>Lavozim</span>
            <p>{doctor?.department}</p>
          </div> */}

          <div className={s.InfoRow}>
            <span>Tajriba</span>
            <p>{doctor?.experience_years || 0} yil</p>
          </div>
        </div>

        <div className={s.InfoCard}>
          <h3>
            <i className="bi bi-telephone"></i>
            Aloqa ma'lumotlari
          </h3>

          <div className={s.InfoRow}>
            <span>Telefon</span>
            <p>{doctor?.contact_number || "-"}</p>
          </div>

          <div className={s.InfoRow}>
            <span>Manzil</span>
            <p>{doctor?.address || "-"}</p>
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
          role="doctor"
          title="Profilni tahrirlash"
          subtitle="Shifokor ma'lumotlarini yangilang"
          onSubmit={() => setEditOpen(false)}

        />
      </Modal>

    </div>
  );
};

export default AssistantDoctorProfile;