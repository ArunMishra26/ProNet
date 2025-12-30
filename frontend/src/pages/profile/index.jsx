import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import styles from "./index.module.css";
import { BASE_URL } from "@/config";
import { getAboutUser } from "@/config/redux/action/authAction";
import { clientServer } from "@/config";
import { getAllPosts } from "@/config/redux/action/postAction";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const { posts } = useSelector((state) => state.postReducer);

  const profilePicRef = useRef(null);
  const coverPicRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [work, setWork] = useState([]);
  const [myPosts, setMyPosts] = useState([]);

  useEffect(() => {
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
    dispatch(getAllPosts());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setUsername(user.userId?.username || "");
      setBio(user.bio || "");
      setWork(user.pastWork || []);
    }
  }, [user]);

  useEffect(() => {
    if (!posts || !user?.userId?._id) return;
    setMyPosts(posts.filter(p => p.userId?._id === user.userId._id));
  }, [posts, user]);

  /* ================= PROFILE PIC ================= */
  const uploadProfilePic = async (file) => {
    const fd = new FormData();
    fd.append("profile_picture", file);
    fd.append("token", localStorage.getItem("token"));
    await clientServer.post("/update_profile_picture", fd);
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
  };

  /* ================= COVER PIC ================= */
  const uploadCoverPic = async (file) => {
    const fd = new FormData();
    fd.append("cover_picture", file);
    fd.append("token", localStorage.getItem("token"));
    await clientServer.post("/update_cover_picture", fd);
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
  };

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    await clientServer.post("/user_update", {
      token: localStorage.getItem("token"),
      username,
    });

    await clientServer.post("/update_profile_data", {
      token: localStorage.getItem("token"),
      bio,
      pastWork: work,
    });

    setEditMode(false);
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
  };

  if (isLoading || !user) return null;

  return (
    <UserLayout>
      <DashboardLayout>

        {/* ================= COVER ================= */}
        
<div
  className={styles.cover}
  style={{
    backgroundImage: user.userId.coverPicture
      ? `url(${BASE_URL}/${user.userId.coverPicture.replace(/^uploads[\\/]/, "")}?t=${new Date().getTime()})`
      : `url(https://images.pexels.com/photos/545521/pexels-photo-545521.jpeg)`
  }}
>
  <button
    className={styles.coverBtn}
    onClick={() => coverPicRef.current.click()}
  >
    Change Cover
  </button>
  <input
    type="file"
    hidden
    ref={coverPicRef}
    onChange={(e) => uploadCoverPic(e.target.files[0])}
  />
</div>


        <div className={styles.main}>

          {/* ================= LEFT CARD ================= */}
          <div className={styles.leftCard}>
            <div
              className={styles.profilePic}
              onClick={() => profilePicRef.current.click()}
            >
              <img src={`${BASE_URL}/${user.userId.profilePicture}`} />
              <span>Edit</span>
            </div>

            <input
              type="file"
              hidden
              ref={profilePicRef}
              onChange={(e) => uploadProfilePic(e.target.files[0])}
            />

            {editMode ? (
              <>
                <input
                  className={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <textarea
                  className={styles.textarea}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </>
            ) : (
              <>
                <h2>{user.userId.username}</h2>
                <p className={styles.bio}>{user.bio || "No bio added"}</p>
              </>
            )}

            <h3>Work History</h3>
            {work.map((w, i) => (
  <div key={i} className={styles.work}>
    {editMode ? (
      <>
        <input
          className={styles.input}
          value={w.company}
          placeholder="Company"
          onChange={(e) => {
            const n = [...work];
            n[i].company = e.target.value;
            setWork(n);
          }}
        />
        <input
          className={styles.input}
          value={w.position}
          placeholder="Position"
          onChange={(e) => {
            const n = [...work];
            n[i].position = e.target.value;
            setWork(n);
          }}
        />
        <input
          className={styles.input}
          value={w.years}
          placeholder="Years"
          onChange={(e) => {
            const n = [...work];
            n[i].years = e.target.value;
            setWork(n);
          }}
        />
        {/* Remove button for each work item */}
        <button
          className={styles.removeBtn}
          onClick={() => {
            const n = [...work];
            n.splice(i, 1); // remove only this item
            setWork(n);
          }}
        >
          Remove
        </button>
      </>
    ) : (
      <>
        <strong>{w.company}</strong>
        <p>{w.position}</p>
        <span>{w.years}</span>
      </>
    )}
  </div>
))}


            {editMode && (
              <button
                className={styles.addBtn}
                onClick={() =>
                  setWork([...work, { company: "", position: "", years: "" }])
                }
              >
                + Add Work
              </button>
            )}

            <button
              className={styles.editBtn}
              onClick={editMode ? saveProfile : () => setEditMode(true)}
            >
              {editMode ? "Save Profile" : "Edit Profile"}
            </button>
          </div>

          {/* ================= RIGHT CARD ================= */}
          <div className={styles.rightCard}>
            <h3>Recent Activity</h3>

            {myPosts.length === 0 && <p>No recent activity</p>}

            {myPosts.map(post => (
              <div key={post._id} className={styles.activity}>
                {post.file && (
                  <img src={`${BASE_URL}/${post.file}`} />
                )}
                <p>{post.body}</p>
              </div>
            ))}
          </div>

        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
