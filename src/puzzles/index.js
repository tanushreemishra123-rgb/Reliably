import summarizer from "./summarizer.js";
import approve from "./approve.js";
import router from "./router.js";
import extractor from "./extractor.js";
import timeout from "./timeout.js";
import grounding from "./grounding.js";
import fallback from "./fallback.js";
import resume from "./resume.js";

// Ordered beginner → advanced. Add a puzzle by dropping a module here.
export const PUZZLES = [summarizer, approve, router, extractor, timeout, grounding, fallback, resume];
