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
} from "@/config/redux/action/authAction";

export default function ViewProfilePage({ userProfile }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const { posts } = useSelector((state) => state.postReducer);
  const authState = useSelector((state) => state.auth);

  const [userPosts, setUserPosts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selfProfile, setSelfProfile] = useState(false);

  const myId = authState.user?._id;
  const profileId = userProfile?.userId?._id;

  // Fetch posts and connections
  useEffect(() => {
    dispatch(getAllPosts());
    dispatch(getConnectionsRequest({ token: localStorage.getItem("token") }));
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
  }, [dispatch]);

  // Filter posts of this profile
  useEffect(() => {
    if (!posts) return;
    const filtered = posts.filter(
      (p) => p.userId?.username === router.query.username
    );
    setUserPosts(filtered);
  }, [posts, router.query.username]);

  // Determine self-profile and connection status
  useEffect(() => {
    if (!myId || !profileId) return;

    let pending = false;
    let connected = false;

    if (myId.toString() === profileId.toString()) {
      // Self-profile: show as connected
      connected = true;
      pending = false;
      setSelfProfile(true);
    } else {
      setSelfProfile(false);

      if (authState.connections) {
        authState.connections.forEach((c) => {
          const isBetween =
            (c.userId?._id.toString() === myId.toString() &&
             c.connectionId?._id.toString() === profileId.toString()) ||
            (c.userId?._id.toString() === profileId.toString() &&
             c.connectionId?._id.toString() === myId.toString());

          if (isBetween) {
            if (c.status_accepted === true) {
              connected = true;
            } else if (c.status_accepted === null) {
              if (c.userId?._id.toString() === myId.toString()) {
                pending = true;
              }
            }
          }
        });
      }
    }

    setIsPending(pending);
    setIsConnected(connected);
  }, [authState.connections, myId, profileId]);

  // Send connection request
  const handleConnect = async () => {
    if (!profileId) return;

    await dispatch(
      sendConnectionRequest({
        token: localStorage.getItem("token"),
        connectionId: profileId,
      })
    );

    setIsPending(true);

    // Refresh connections after sending request
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
    dispatch(getConnectionsRequest({ token: localStorage.getItem("token") }));
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.container}>
          <div className={styles.coverWrapper}>
            <div className={styles.cover}></div>
            <img
              src={`${BASE_URL}/${userProfile.userId.profilePicture}`}
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
                  {/* Show button always; self-profile shows Connected */}
                  {(selfProfile || !selfProfile) && (
                    <>
                      {isConnected ? (
                        <button className={styles.connectedBtn}>Connected</button>
                      ) : isPending ? (
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

export async function getServerSideProps(context) {
  const res = await clientServer.get("/user/get_profile_based_on_username", {
    params: { username: context.query.username },
  });

  return {
    props: { userProfile: res.data.profile },
  };
}
