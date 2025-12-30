import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import Profile from "../models/profile.model.js";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import fs from "fs";
import ConnectionRequest from "../models/connections.model.js";
import Comment from "../models/comments.model.js";
import Post from "../models/posts.model.js";


const convertUserDataTOPDF = async (userData) => {
  const doc = new PDFDocument();
  const outputPath = crypto.randomBytes(32).toString("hex") + ".pdf";
  const stream = fs.createWriteStream("uploads/" + outputPath);
  doc.pipe(stream);
  doc.image(`uploads/${userData.userId.profilePicture}`, {
    align: "center",
    width: 100,
  });
  doc.fontSize(14).text(`Name: ${userData.userId.name}`);
  doc.fontSize(14).text(`Username: ${userData.userId.username}`);
  doc.fontSize(14).text(`Email: ${userData.userId.email}`);
  doc.fontSize(14).text(`Bio: ${userData.userId.bio}`);
  doc.fontSize(14).text(`Current Position: ${userData.currentPost}`);

  if (Array.isArray(userData.pastWork) && userData.pastWork.length > 0) {
    doc.moveDown().fontSize(16).text("Past Work:", { underline: true });
    userData.pastWork.forEach((work) => {
      doc.moveDown(0.5);
      doc.fontSize(14).text(`Company Name: ${work.company || "N/A"}`);
      doc.fontSize(14).text(`Position: ${work.position || "N/A"}`);
      doc.fontSize(14).text(`Years: ${work.years || "N/A"}`);
    });
  } else {
    doc.moveDown().fontSize(14).text("No past work records available.");
  }
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
    doc.end();
  });
};

export const register = async (req, res) => {
  console.log(req.body);
  try {
    const { name, email, password, username } = req.body;
    if (!name || !email || !password || !username)
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({
      email,
    });

    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      username,
    });

    await newUser.save();
    const profile = new Profile({ userId: newUser._id });
    await profile.save();
    return res.json({ message: "User Registered Successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({
      email,
    });
    if (!user) return res.status(404).json({ message: "User doest not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    const token = crypto.randomBytes(32).toString("hex");
    await User.updateOne({ _id: user._id }, { token });
    return res.json({ token: token });
  } catch (error) {
    return res.status(500).json({message:error.message})
  }
};

export const uploadProfilePicture = async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.profilePicture = req.file.filename;
    await user.save();
    return res.json({ message: "Profile Picture Updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { token, ...newUserData } = req.body;

    const user = await User.findOne({ token: token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { username, email } = newUserData;
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser && String(existingUser._id) !== String(user._id)) {
        return res.status(400).json({ message: "User already exists" });
      }
    }
    Object.assign(user, newUserData);
    await user.save();
    return res.json({ message: "User Updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getUserAndProfile = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userProfile = await Profile.findOne({ userId: user._id }).populate(
      "userId",
      "name email username profilePicture coverPicture"
    );

    return res.json(userProfile);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProfileData = async (req, res) => {
  try {
    const { token, ...newProfileData } = req.body;
    const userProfile = await User.findOne({ token: token });
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }
    const profile_to_update = await Profile.findOne({
      userId: userProfile._id,
    });
    Object.assign(profile_to_update, newProfileData);
    await profile_to_update.save();
    return res.json({ message: "Profile Updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllUserProfile = async (req, res) => {
  try {
    const profiles = await Profile.find()
  .populate("userId", "name username email profilePicture")
  .then(profiles => profiles.filter(p => p.userId !== null));

return res.json({ profiles });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const downloadProfile = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: "user_id is required" });
  }

  const userProfile = await Profile.findOne({ userId: user_id }).populate(
    "userId",
    "name username email profilePicture"
  );

  if (!userProfile || !userProfile.userId) {
    return res.status(404).json({ message: "User profile not found" });
  }

  const outputPath = await convertUserDataTOPDF(userProfile);
  return res.json({ message: outputPath });
};


export const sendConnectionRequest = async (req, res) => {
  const { token, connectionId } = req.body;

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // prevent duplicate connection
    const alreadyConnected = await ConnectionRequest.findOne({
      userId: user._id,
      connectionId,
    });

    if (alreadyConnected) {
      return res.status(400).json({ message: "Already connected" });
    }

    // ✅ AUTO-ACCEPT CONNECTION
    const connection = await ConnectionRequest.create({
      userId: user._id,
      connectionId,
      status_accepted: null, // 🔥 IMPORTANT CHANGE
    });

    return res.status(201).json({
      message: "Connected request sent",
      connection,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const getMyConnectionsRequests = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ DECLARE connections properly
    const connections = await ConnectionRequest.find({
      $or:[
        {userId : user._id},
        {connectionId: user._id}
      ]
    }).populate(
      "userId connectionId",
      "name username email profilePicture"
    );

    // ✅ SEND connections (plural)
    return res.status(200).json({ connections });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const whatAreMyConnections = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const connections = await ConnectionRequest.find({
      connectionId: user._id,
    }).populate("userId", "name username email profilePicture");

    return res.json(connections);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  const { token, requestId, action_type } = req.body;

  try {
    // 1️⃣ Validate user
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Find the pending connection request
    const connection = await ConnectionRequest.findOne({
      _id: requestId,
      connectionId: user._id,
      status_accepted: null, // only pending requests
    });

    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }


    if (action_type === "accept") {
      connection.status_accepted = true;
    } else if (action_type === "reject") {
      connection.status_accepted = false;
    } else {
      return res.status(400).json({ message: "Invalid action type" });
    }

    // 4️⃣ Save changes
    await connection.save();

    return res.status(200).json({
      message: "Connection updated successfully",
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



export const commentPost = async (req, res) => {
  const { token, post_id, commentBody } = req.body;
  try {
    const user = await User.findOne({ token: token }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const post = await Post.findOne({
      _id: post_id,
    });
    if (!post) {
      return res.status(404).json({ message: "Post not Found" });
    }

    const comment = new Comment({
      userId: user._id,
      postId: post._id,
      body: commentBody,
    });

    await comment.save();
    return res.status(200).json({ message: "Comment Added" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


export const getUserProfileAndUserBasedOnUsername = async(req,res) => {
  const {username} = req.query;
  try{
    const user = await User.findOne({
      username
    });
    if(!user){
      return res.status(404).json({message:"User not found"})
    }

    const userProfile = await Profile.findOne({userId: user._id})
    .populate('userId', 'name username email profilePicture');
    return res.json({"profile": userProfile})
  } catch(error){
    return res.status(500).json({message:error.message})

  }
}


export const uploadCoverPicture = async (req, res) => {
  const { token } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No cover image uploaded" });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.coverPicture = req.file.path;
    await user.save();

    return res.json({
      message: "Cover Picture Updated",
      coverPicture: user.coverPicture
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
