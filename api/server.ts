import { createApp } from "../server/app";

export default createApp();

export const config = {
  api: {
    bodyParser: false,
  },
};
