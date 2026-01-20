import { useOutletContext } from "react-router-dom";
import type { JamDetailsContextValue } from "./JamDetailsLayout";

export const useJamDetailsContext = () =>
  useOutletContext<JamDetailsContextValue>();
