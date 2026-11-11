// @ts-check
import { module } from "@prisma/composer";
import adminService from "./apps/web-admin/service.mjs";

export default module("httlsg", ({ provision }) => {
  provision(adminService);
});
