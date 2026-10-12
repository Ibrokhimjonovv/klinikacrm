import axios from "axios";
import { api } from "../App";

const API = axios.create({
  baseURL: "https://bkapi.aoc.uz/api/v1",
});

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("hospital_access")

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCashierDashboard = () => API.get("/cashier/dashboard/");