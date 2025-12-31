const {default: axios} = require("axios");

export const BASE_URL = "https://pronet-1.onrender.com";

export const clientServer = axios.create({
  baseURL: BASE_URL,
});
