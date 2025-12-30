import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";

import UserLayout from "@/layout/UserLayout";
import DashboardLayout from "@/layout/DashboardLayout";
import styles from "./index.module.css";
import { BASE_URL, clientServer } from "@/config";

import { getAllPosts } from "@/config/redux/action/postAction";
import {
  getConnectionsRequest,
  getMyConnectionRequests,
  sendConnectionRequest,
  AcceptConnection
} from "@/config/redux/action/authAction";


export default function ViewProfilePage({ userProfile }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const { posts } = useSelector((state) => state.postReducer);
  const authState = useSelector((state) => state.auth);

  const [userPosts, setUserPosts] = useState([]);
  const [selfProfile, setSelfProfile] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  const myId = authState.user?.userId?._id;
  const profileId = userProfile?.userId?._id;

  // --- Redux connections will determine Pending/Connected ---
  const [status, setStatus] = useState("connect"); // connect, pending, connected

  // Fetch posts and connections
  useEffect(() => {
    dispatch(getAllPosts());
    dispatch(getConnectionsRequest({ token: localStorage.getItem("token") }));
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
  }, [dispatch]);

  // Filter posts of this profile
  useEffect(() => {
    if (!posts) return;
    const filtered = posts.filter((p) => p.userId?._id === profileId);
    setUserPosts(filtered);
  }, [posts, profileId]);

  // Update cover & profile picture (cache-busting)
  useEffect(() => {
    if (!userProfile) return;
    const timestamp = new Date().getTime();
    setCoverUrl(
      userProfile.userId.coverPicture
        ? `${BASE_URL}/${userProfile.userId.coverPicture.replace(/^uploads[\\/]/, "")}?t=${timestamp}`
        : "https://images.pexels.com/photos/545521/pexels-photo-545521.jpeg"
    );
    setProfileUrl(
      userProfile.userId.profilePicture
        ? `${BASE_URL}/${userProfile.userId.profilePicture}?t=${timestamp}`
        : ""
    );
  }, [userProfile]);
  useEffect(() => {
  updateStatus();
}, [authState.connections, myId, profileId]);


  // --- Calculate connection status from Redux state ---
  const updateStatus = () => {
    if (!authState.connections || !myId || !profileId) return;

    if (myId.toString() === profileId.toString()) {
      setStatus("connected");
      setSelfProfile(true);
      return;
    } else {
      setSelfProfile(false);
    }

    let newStatus = "connect"; // default
    authState.connections.forEach((c) => {
      const isBetween =
        (c.userId?._id.toString() === myId.toString() && c.connectionId?._id.toString() === profileId.toString()) ||
        (c.userId?._id.toString() === profileId.toString() && c.connectionId?._id.toString() === myId.toString());

      if (isBetween) {
        if (c.status_accepted === true) newStatus = "connected";
        else if (c.status_accepted === null && c.userId?._id.toString() === myId.toString()) newStatus = "pending";
      }
    });

    setStatus(newStatus);
  };

  // Listen to Redux connections changes for real-time update
  useEffect(() => {
    updateStatus();
  }, [authState.connections, myId, profileId]);

  // --- Connect button click ---
  const handleConnect = async () => {
    if (!profileId) return;
    setStatus("pending"); // instant pending
    await dispatch(
      sendConnectionRequest({ token: localStorage.getItem("token"), connectionId: profileId })
    );
    // Fetch updated connections
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
    dispatch(getConnectionsRequest({ token: localStorage.getItem("token") }));
  };

  // --- Accept connection (for demonstration, can call this in accept button) ---
  const handleAccept = async (connectionId) => {
    await dispatch(
      acceptConnectionRequest({ token: localStorage.getItem("token"), connectionId })
    );
    // Redux connections updated → useEffect will trigger → status updated
    dispatch(getConnectionsRequest({ token: localStorage.getItem("token") }));
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.container}>
          {/* COVER IMAGE */}
          <div className={styles.coverWrapper}>
            <div
              className={styles.cover}
              style={{ backgroundImage: `url(${coverUrl})` }}
            ></div>
            <img
              src={profileUrl}
              alt="profile"
              className={styles.profilePic}
            />
          </div>

          <div className={styles.contentGrid}>
            {/* LEFT */}
            <div>
              <div className={styles.nameRow}>
                <h2>{userProfile.userId.name}</h2>
                <span>@{userProfile.userId.username}</span>
              </div>

              {/* ACTIONS */}
              <div className={styles.actionRow}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
                  {!selfProfile && (
                    <>
                      {status === "connected" ? (
                        <button className={styles.connectedBtn}>Connected</button>
                      ) : status === "pending" ? (
                        <button className={styles.pendingBtn}>Pending</button>
                      ) : (
                        <button
                          onClick={handleConnect}
                          className={styles.connectBtn}
                        >
                          Connect
                        </button>
                      )}
                    </>
                  )}

                  {/* DOWNLOAD RESUME */}
                  <div
                    onClick={async () => {
                      const response = await clientServer.get(
                        `/user/download_resume?user_id=${profileId}`
                      );
                      window.open(`${BASE_URL}/${response.data.message}`, "_blank");
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <svg
                      style={{ width: "1.2em" }}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <p className={styles.bio}>{userProfile.bio}</p>

              {/* Work history */}
              <div className={styles.workHistory}>
                <h3>Work History</h3>
                <div className={styles.workHistoryContainer}>
                  {userProfile.pastWork.map((w, i) => (
                    <div key={i} className={styles.workCard}>
                      <strong>
                        {w.company} – {w.position}
                      </strong>
                      <p>{w.years}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className={styles.rightSection}>
              <h3>Recent Activity</h3>

              {userPosts.length === 0 && <p className={styles.noPost}>No recent posts</p>}

              {userPosts.map((post) => (
                <div key={post._id} className={styles.postCard}>
                  {post.file && (
                    <img src={`${BASE_URL}/${post.file}`} alt="post" className={styles.postImg} />
                  )}
                  <p>{post.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

// Server side fetch
export async function getServerSideProps(context) {
  const res = await clientServer.get("/user/get_profile_based_on_username", {
    params: { username: context.query.username },
  });

  return {
    props: { userProfile: res.data.profile },
  };
}
