import type { UpdateHandler } from "../types.js";
import { textMessageHandler } from "./textMessage.js";
import { mediaHandler } from "./media.js";
import { membershipHandler } from "./membership.js";
import { serviceHandler } from "./service.js";

export const handlers: UpdateHandler[] = [
  membershipHandler,
  serviceHandler,
  mediaHandler,
  textMessageHandler,
];
