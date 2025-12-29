import UserLayout from "@/layout/UserLayout";
import React, { useEffect } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { useDispatch, useSelector } from "react-redux";
import {
  AcceptConnection,
  getMyConnectionRequests,
  getConnectionsRequest,
} from "@/config/redux/action/authAction";
import styles from "./index.module.css";
import { BASE_URL } from "@/config";
import { useRouter } from "next/router";

export default function MyConnectionsPage() {
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const router = useRouter();

  // ---------------- LOAD CONNECTIONS ----------------
  useEffect(() => {
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
  }, [dispatch]);

  // ---------------- HANDLE ACCEPT ----------------
  const handleAccept = async (requestId) => {
    await dispatch(
      AcceptConnection({
        token: localStorage.getItem("token"),
        requestId: requestId,
        action_type: "accept",
      })
    );

    // 🔄 Refresh connections
    await dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
    await dispatch(getConnectionsRequest({ token: localStorage.getItem("token") }));
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.7rem" }}>
          <h3>My Connections</h3>

          {authState.connectionRequest.length === 0 && (
            <h1>No Connection Request Pending</h1>
          )}

          {authState.connectionRequest
            .filter((connection) => connection.status_accepted === null)
            .map((user, index) => (
              <div
                onClick={() => router.push(`/view_profile/${user.userId.username}`)}
                className={styles.userCard}
                key={index}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.2rem",
                    justifyContent: "space-between",
                  }}
                >
                  <div className={styles.profilePicture}>
                    <img src={`${BASE_URL}/${user.userId.profilePicture}`} alt="" />
                  </div>
                  <div className={styles.userInfo}>
                    <h3>{user.userId.name}</h3>
                    <p>{user.userId.username}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept(user._id); // ✅ requestId pass
                    }}
                    className={styles.connectedButton}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}

          <h3>My Network</h3>

          {authState.connectionRequest
            .filter((connection) => connection.status_accepted === true)
            .map((user, index) => (
              <div
                onClick={() => router.push(`/view_profile/${user.userId.username}`)}
                className={styles.userCard}
                key={index}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.2rem",
                    justifyContent: "space-between",
                  }}
                >
                  <div className={styles.profilePicture}>
                    <img src={`${BASE_URL}/${user.userId.profilePicture}`} alt="" />
                  </div>
                  <div className={styles.userInfo}>
                    <h3>{user.userId.name}</h3>
                    <p>{user.userId.username}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
