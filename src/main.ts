import "./style.css";
import { bootstrap } from "./app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("게임 루트 요소를 찾을 수 없습니다.");
bootstrap(root);
