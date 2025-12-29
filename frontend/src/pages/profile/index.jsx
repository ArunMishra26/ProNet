import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import styles from "./index.module.css";
import { BASE_URL } from "@/config";
import { getAboutUser } from "@/config/redux/action/authAction";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const { user, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
  }, [dispatch]);

  const handleEditClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log("Selected file:", file);
    // यहाँ आप API कॉल करके backend में अपलोड कर सकते हो
  };

  if (isLoading || !user?.userId) {
    return (
      <UserLayout>
        <DashboardLayout>
          <p className={styles.loading}>Loading profile...</p>
        </DashboardLayout>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.container}>
          {/* COVER */}
          <div className={styles.coverWrapper}>
            <div className={styles.cover}></div>

            {/* PROFILE IMAGE */}
            <div
              className={styles.profileImageWrapper}
              onClick={handleEditClick}
            >
              <img
                src={`${BASE_URL}/${user.userId.profilePicture}`}
                alt="profile"
                className={styles.profilePic}
              />

              {/* HOVER OVERLAY */}
              <div className={styles.editOverlay}>
                <span>Edit</span>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              hidden
              onChange={handleFileChange}
            />
          </div>

          {/* USER INFO */}
          <div className={styles.infoSection}>
            <h2>{user.userId.name}</h2>
            <p className={styles.username}>@{user.userId.username}</p>
            {user.bio && <p className={styles.bio}>{user.bio}</p>}

            {/* WORK HISTORY */}
            {user.workHistory && (
              <div className={styles.workHistory}>
                <h3>Work History</h3>
                {user.workHistory.map((work, index) => (
                  <div key={index} className={styles.workItem}>
                    <strong>{work.company}</strong> – {work.position}
                    <span>{work.experience}+ yrs</span>
                  </div>
                ))}
              </div>
            )}

            {/* RECENT ACTIVITY */}
            {user.recentActivity && (
              <div className={styles.recentActivity}>
                <h3>Recent Activity</h3>
                {user.recentActivity.map((act, index) => (
                  <div key={index} className={styles.activityItem}>
                    {act}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
