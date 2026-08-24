export interface DialogueStage {
  readonly progress: number;
  readonly lines: readonly string[];
}

export const MUSIC_SHOP_DIALOGUE = [
  {
    progress: 0,
    lines: [
      "어서 와. 나는 다카포. 이 가게는 한동안 같은 첫 마디만 되풀이하고 있어.",
      "혹시 흩어진 음을 찾거든… 내게도 들려줘.",
    ],
  },
  {
    progress: 1,
    lines: [
      "방금 그 리듬, 피네가 카운터를 두드리던 박자와 닮았네.",
      "이상하지. 오래 잊었다고 생각했는데.",
    ],
  },
  {
    progress: 2,
    lines: [
      "피네는 틀린 음을 발견하면 연주를 멈추지 않고 웃었어.",
      "나는 늘 처음부터 다시 하자고 했고.",
    ],
  },
  {
    progress: 3,
    lines: [
      "D.C.는 처음으로 돌아가라는 뜻이야.",
      "그래서 내 이름이 마음에 들었지. 돌아갈 수 있을 것 같아서.",
    ],
  },
  {
    progress: 4,
    lines: [
      "피네는 끝을 뜻하는 이름을 싫어하지 않았어.",
      "끝이 있어야 다음 곡을 고를 수 있다고 했지.",
    ],
  },
  {
    progress: 5,
    lines: [
      "그날 이후 나는 마지막 마디를 듣지 못했어.",
      "곡이 끝나기 전에 처음으로 돌아오면, 아무 일도 일어나지 않은 것 같았거든.",
    ],
  },
  {
    progress: 6,
    lines: [
      "계속 되돌아가도 피네의 연주는 돌아오지 않았어.",
      "이 가게에 남은 건 기억이 아니라 멈춰 버린 반복이었나 봐.",
    ],
  },
  {
    progress: 7,
    lines: [
      "D.C. al Fine… 처음으로 돌아가, 끝에서 멈춘다.",
      "이번에는 도망치지 않을게. 피네가 남긴 마지막 마디까지 들어볼게.",
    ],
  },
] as const satisfies readonly DialogueStage[];

