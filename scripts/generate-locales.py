"""Generate baked locale data from the Korean source copy.

Run this after changing visible Korean copy, then review the generated English and
Japanese wording before publishing.
"""

import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_FILES = [
    ROOT / "index.html",
    ROOT / "project.html",
    ROOT / "scripts" / "portfolio-data.js",
    ROOT / "scripts" / "work-content.js",
    ROOT / "scripts" / "render-projects.js",
    ROOT / "scripts" / "render-project-detail.js",
]
KOREAN = re.compile(r"[가-힣]")
STRING = re.compile(r'"((?:\\.|[^"\\])*)"', re.DOTALL)
TEMPLATE_LITERAL = re.compile(r"`(?:\\.|[^`\\])*`", re.DOTALL)
POLISH = {
    "en": {
        "Chungkang University of Cultural Industries": "Chungkang College of Cultural Industries",
        "Chungkang University of Culture and Industry": "Chungkang College of Cultural Industries",
    },
    "ja": {
        "青江文化産業大学": "チョンガン文化産業大学",
        "青江大学": "チョンガン文化産業大学",
        "聴講隊": "チョンガン文化産業大学",
    },
}
MANUAL_TRANSLATIONS = {
    "en": {
        "공격 콤보 · 애니메이션 클립 이벤트로 입력 구간 제어":
            "Attack Combos: Driving the Input Window from Animation Clip Events",
        "콤보 입력을 받는 구간의 시작과 끝을 공격 애니메이션 클립에 이벤트로 심었습니다. 입력 구간이 열려 있는 동안 공격 키를 누르면 다음 콤보를 예약해 두고, 클립 뒤쪽에 심어 둔 이벤트가 예약된 공격을 바로 이어서 재생합니다. 경과 시간 대신 클립 이벤트를 기준으로 삼았기 때문에 애니메이션 길이가 바뀌어도 코드에서 타이밍 값을 다시 맞출 필요가 없습니다. 대쉬 중이거나 Spline 이동 중일 때는 입력 자체를 받지 않도록 막았습니다.":
            "I embedded events at the start and end of the combo input window directly in the attack animation clips. While the window is open, pressing attack queues the next combo, and an event placed later in the clip immediately chains into the queued attack. Because the timing comes from clip events rather than elapsed time, changing an animation's length never requires retuning timing values in code. Input is blocked outright while dashing or moving along a spline.",
        "AttackSystem.cs · 콤보 입력 예약과 다음 공격 연결":
            "AttackSystem.cs: Queuing combo input and chaining the next attack",
        "피격 무적 · 중첩을 견디는 카운터 방식":
            "Hit Invincibility: A Counter That Survives Overlap",
        "무적 상태를 bool 하나로 두면 피격 무적이 끝나는 순간 다른 곳에서 건 무적까지 같이 풀리는 문제가 있습니다. 그래서 무적을 정수 카운터로 관리해 무적을 건 쪽이 각자 올리고 내리도록 했습니다. 카운터가 0보다 크면 피격 판정을 무시하므로, 피격 무적과 아이템 효과가 겹쳐도 서로의 상태를 덮어쓰지 않습니다. 피격 처리는 넉백과 입력 잠금, 피격 애니메이션을 함께 실행하고 무적 시간 동안 캐릭터를 깜빡이게 합니다.":
            "With a single bool, invincibility granted elsewhere would be cleared the moment hit invincibility expired. So I tracked invincibility as an integer counter that each source increments and decrements on its own. Any value above zero makes damage checks fail, so hit invincibility and item effects can overlap without overwriting each other. The hit response runs knockback, an input lock, and the hit animation together, and blinks the character for the duration of the invincibility.",
        "Player.cs · 카운터 기반 무적과 피격 처리":
            "Player.cs: Counter-based invincibility and hit handling",
        "One Way Platform · 진입 방향으로 통과 판정":
            "One-Way Platform: Deciding Pass-Through from the Approach Direction",
        "아래에서 올라올 때는 통과하고 위에서 밟을 때는 막아야 하는 발판입니다. 플레이어가 트리거에 들어온 순간의 Rigidbody 속도를 접근 방향으로 삼고, 속도가 거의 없으면 위치 차이로 방향을 구합니다. 그 방향과 발판에 설정한 진입 방향을 내적해 반대쪽에서 접근한 경우에만 Physics.IgnoreCollision으로 충돌을 꺼 줍니다. 아래 점프는 별도 메서드로 충돌을 강제로 무시하게 만들고, 트리거를 벗어나면 충돌을 되돌립니다.":
            "This platform has to be passable from below but solid when landed on from above. The Rigidbody velocity at the moment the player enters the trigger gives the approach direction, falling back to the difference in position when velocity is negligible. That direction is dotted against the platform's configured entry direction, and collision is disabled through Physics.IgnoreCollision only for approaches from the opposite side. Drop-through jumps force the collision off via a separate method, and leaving the trigger restores it.",
        "OneWayPlatform.cs · 접근 방향 내적으로 통과 여부 결정":
            "OneWayPlatform.cs: Deciding pass-through with a dot product on the approach direction",
        "Spline 기반 Z축 이동":
            "Spline-Based Z-Axis Movement",
        "사이드뷰 스테이지에서 앞뒤 공간으로 넘어가는 이동입니다. 존에 진입하면 Unity Splines의 경로를 정규화된 시간으로 훑으면서 플레이어 위치를 옮기고, 같은 지점의 탄젠트를 구해 진행 방향을 바라보게 합니다. 역방향은 시간을 거꾸로 흘리고 탄젠트를 뒤집어 같은 경로를 그대로 재사용했습니다. 이동을 시작할 때 맵 섹션 인덱스를 옮기고 카메라를 Z 이동용 프리셋으로 전환했다가, 도착하면 이전 프리셋으로 되돌립니다.":
            "This is the transition into the space in front of or behind a side-view stage. On entering the zone, the player is moved along a Unity Splines path sampled by normalized time, and the tangent at the same point turns the character to face the direction of travel. Reverse travel runs time backwards and flips the tangent, reusing the exact same path. Starting the move shifts the map section index and switches the camera to a Z-movement preset, which is restored on arrival.",
        "Spline.cs · 경로를 따라 플레이어를 이동시키는 코루틴":
            "Spline.cs: The coroutine that moves the player along the path",
        "몬스터 공통 Base와 Behavior Tree":
            "A Shared Monster Base and Behavior Tree",
        "Ira, Nuovo, Scopi가 각각 다르게 움직이지만 판정 기준과 상태 전환은 같아야 했습니다. 그래서 추상 클래스 MonsterBase에 이동·공격·스턴·탐지 범위 판정 같은 공통 계약을 선언하고 몬스터별 클래스가 이를 구현하도록 했습니다. Behavior Tree 노드는 몬스터를 직접 움직이지 않고, 블랙보드로 받은 MonsterBase에 플래그와 목표 위치만 넘깁니다. 실제 이동은 몬스터 쪽이 처리하므로 트리를 수정해도 몬스터 구현은 건드리지 않아도 됩니다.":
            "Ira, Nuovo, and Scopi each move differently, but their detection rules and state transitions had to stay consistent. So the abstract MonsterBase class declares the shared contract for movement, attacks, stuns, and range checks, and each monster class implements it. Behavior tree nodes never move a monster directly; they only pass flags and a target position to the MonsterBase they receive from the blackboard. Since the monster itself performs the movement, editing the tree never requires touching the monster implementations.",
        "MonsterBase.cs · 몬스터가 구현해야 할 공통 계약":
            "MonsterBase.cs: The shared contract every monster implements",
        "ChaseAction.cs · 이동을 직접 하지 않고 플래그만 넘기는 BT 노드":
            "ChaseAction.cs: A behavior-tree node that passes flags instead of moving anything",
        "ScriptableObject 카메라 프리셋":
            "ScriptableObject Camera Presets",
        "전투, Z축 이동, 컷신처럼 상황마다 필요한 카메라 값이 달라서 설정을 ScriptableObject 프리셋으로 분리했습니다. 카메라 거리, 화면상 위치, 데드존, 타겟 오프셋 같은 값마다 사용 여부 토글을 두어 프리셋이 지정한 항목만 덮어쓰고 나머지는 현재 값을 유지하게 했습니다. 전환 커브와 시간도 프리셋에 함께 담아 상황이 바뀔 때 카메라가 튀지 않고 넘어가도록 했습니다. 덕분에 새로운 연출은 코드 수정 없이 프리셋 에셋을 만들어 트리거에 연결하는 것으로 끝납니다.":
            "Combat, Z-axis movement, and cutscenes each need different camera values, so I moved the settings out into ScriptableObject presets. Every value — camera distance, screen position, dead zone, target offset — carries its own enable toggle, so a preset overrides only what it specifies and leaves the rest at their current values. The transition curve and duration live in the preset as well, so the camera eases between situations instead of snapping. New shots therefore come down to authoring a preset asset and wiring it to a trigger, with no code changes.",
        "CameraSettings.cs · 항목별 사용 여부를 가진 카메라 프리셋":
            "CameraSettings.cs: A camera preset with per-value enable toggles",
        "아래 코드는 실제 프로젝트에서 발췌했습니다. 제가 작성한 커밋만 따로 추출해 공개한 저장소 github.com/aldkl/dear-my-prince-ta-work 에서 전체 구현을 볼 수 있습니다.":
            "The code below is taken from the actual project. The full implementation is available at github.com/aldkl/dear-my-prince-ta-work, a public repository containing only the commits I authored.",
        "꽃의소녀": "Flower Girl",
        "내가 한 작업": "My Role",
        "문제 해결": "Problem Solving",
        "문제 해결/배운점": "Problem Solving & Takeaways",
        "기술 스택": "Tech Stack",
        "구현 역량": "What I Can Build",
        "Git·GitHub와 배포": "Git, GitHub & Deployment",
        "배칭과 렌더링 최적화": "Batching & Rendering Optimization",
        "실시간 셰이더와 Technical Art": "Real-Time Shaders & Technical Art",
        "AI·카메라·미디어 통합": "AI, Camera & Media Integration",
        "API·OCR 도구 개발": "API & OCR Tool Development",
        "주력": "Primary",
        "활용": "Working",
        "기초": "Basic",
        "상": "High",
        "중": "Intermediate",
        "하": "Basic",
        "EditorWindow로 반복 작업을 도구화하고, 여러 머티리얼의 셰이더 속성을 검색·미리보기·일괄 변경하며 Undo를 지원할 수 있습니다.":
            "I can automate repetitive tasks with EditorWindow tools that search, preview, and bulk-edit shader properties across multiple materials with Undo support.",
        "몬스터 공통 Base와 BT 상태, ScriptableObject 기반 카메라 설정, Animator·Spine·FMOD를 게임 이벤트와 연결할 수 있습니다.":
            "I can connect shared monster bases and behavior-tree states, ScriptableObject-based camera settings, and Animator, Spine, and FMOD systems to gameplay events.",
        "URP 툰 라이팅, SDF 얼굴 그림자, Rim Light, 거리 기반 디더링과 월드 좌표 UV 등 프로젝트에 필요한 화면 표현을 구현할 수 있습니다.":
            "I can implement project-specific visuals including URP toon lighting, SDF face shadows, rim lighting, distance-based dithering, and world-space UVs.",
        "캐릭터를 회전하며 확인한 Rim Light 적용 결과":
            "Rim light behavior verified while rotating the character",
        "광원과 캐릭터 방향 변화에 따른 SDF 얼굴 그림자 결과":
            "SDF face-shadow behavior under changing light and character directions",
        "실제 플레이에서 가림 오브젝트가 거리 기반으로 디더링되는 결과":
            "Distance-based dithering of occluding objects during gameplay",
        "직접 제작한 애니메이션 결과": "Original Animation Work",
        "착지·슬라이딩·점프로 이어지는 플레이어 벽점프 애니메이션":
            "Player wall-jump animation transitioning from landing to sliding and jumping",
        "플레이어 비전투 Idle 애니메이션": "Player non-combat idle animation",
        "몬스터 Scopi 걷기 애니메이션": "Scopi monster walk animation",
        "몬스터 Scopi 캐치 애니메이션": "Scopi monster catch animation",
        "Blend Tree 좌우 방향 전환": "Left/Right Direction Switching with a Blend Tree",
        "사이드뷰에서 캐릭터를 회전해 뒷모습이 보이는 문제를 해결하기 위해 좌·우 애니메이션을 Blend Tree로 연결했습니다. 이동 방향에 따라 bLeftTrue 값을 0 또는 1로 전달해 해당 방향의 애니메이션을 재생합니다.":
            "To prevent the character's back from showing when turning in the side view, I connected left- and right-facing animations through a Blend Tree. The movement direction sets bLeftTrue to 0 or 1 to play the matching animation.",
        "Unity Animator에서 좌·우 달리기 애니메이션을 연결한 Blend Tree":
            "Blend Tree connecting left- and right-facing run animations in Unity Animator",
        "이동 방향에 따라 Blend Tree 파라미터를 전환하는 코드":
            "Code that switches the Blend Tree parameter based on movement direction",
        "Blend Tree를 적용한 캐릭터 좌·우 방향 전환 결과":
            "Character left/right direction switching with the Blend Tree applied",
    },
    "ja": {
        "공격 콤보 · 애니메이션 클립 이벤트로 입력 구간 제어":
            "攻撃コンボ・アニメーションクリップのイベントで入力受付区間を制御",
        "콤보 입력을 받는 구간의 시작과 끝을 공격 애니메이션 클립에 이벤트로 심었습니다. 입력 구간이 열려 있는 동안 공격 키를 누르면 다음 콤보를 예약해 두고, 클립 뒤쪽에 심어 둔 이벤트가 예약된 공격을 바로 이어서 재생합니다. 경과 시간 대신 클립 이벤트를 기준으로 삼았기 때문에 애니메이션 길이가 바뀌어도 코드에서 타이밍 값을 다시 맞출 필요가 없습니다. 대쉬 중이거나 Spline 이동 중일 때는 입력 자체를 받지 않도록 막았습니다.":
            "コンボ入力を受け付ける区間の開始と終了を、攻撃アニメーションクリップにイベントとして埋め込みました。入力区間が開いている間に攻撃キーを押すと次のコンボを予約し、クリップ後半に置いたイベントが予約された攻撃をそのまま繋げて再生します。経過時間ではなくクリップのイベントを基準にしているため、アニメーションの長さが変わってもコード側でタイミング値を調整し直す必要がありません。ダッシュ中やSpline移動中は入力自体を受け付けないようにしています。",
        "AttackSystem.cs · 콤보 입력 예약과 다음 공격 연결":
            "AttackSystem.cs・コンボ入力の予約と次の攻撃への接続",
        "피격 무적 · 중첩을 견디는 카운터 방식":
            "被弾無敵・重ねがけに耐えるカウンター方式",
        "무적 상태를 bool 하나로 두면 피격 무적이 끝나는 순간 다른 곳에서 건 무적까지 같이 풀리는 문제가 있습니다. 그래서 무적을 정수 카운터로 관리해 무적을 건 쪽이 각자 올리고 내리도록 했습니다. 카운터가 0보다 크면 피격 판정을 무시하므로, 피격 무적과 아이템 효과가 겹쳐도 서로의 상태를 덮어쓰지 않습니다. 피격 처리는 넉백과 입력 잠금, 피격 애니메이션을 함께 실행하고 무적 시간 동안 캐릭터를 깜빡이게 합니다.":
            "無敵状態をbool一つで持つと、被弾無敵が切れた瞬間に別の場所で付与した無敵まで一緒に解除されてしまいます。そこで無敵を整数カウンターで管理し、無敵を付与した側がそれぞれ加算・減算するようにしました。カウンターが0より大きい間は被弾判定を無視するため、被弾無敵とアイテム効果が重なっても互いの状態を上書きしません。被弾処理ではノックバックと入力ロック、被弾アニメーションを同時に実行し、無敵時間の間キャラクターを点滅させます。",
        "Player.cs · 카운터 기반 무적과 피격 처리":
            "Player.cs・カウンター方式の無敵と被弾処理",
        "One Way Platform · 진입 방향으로 통과 판정":
            "One Way Platform・進入方向による通過判定",
        "아래에서 올라올 때는 통과하고 위에서 밟을 때는 막아야 하는 발판입니다. 플레이어가 트리거에 들어온 순간의 Rigidbody 속도를 접근 방향으로 삼고, 속도가 거의 없으면 위치 차이로 방향을 구합니다. 그 방향과 발판에 설정한 진입 방향을 내적해 반대쪽에서 접근한 경우에만 Physics.IgnoreCollision으로 충돌을 꺼 줍니다. 아래 점프는 별도 메서드로 충돌을 강제로 무시하게 만들고, 트리거를 벗어나면 충돌을 되돌립니다.":
            "下から上がるときは通り抜け、上から踏むときは足場として機能する必要がある床です。プレイヤーがトリガーに入った瞬間のRigidbodyの速度を接近方向とし、速度がほぼない場合は位置の差から方向を求めます。その方向と足場に設定した進入方向を内積し、反対側から接近した場合にのみPhysics.IgnoreCollisionで衝突を無効化します。下降ジャンプは別メソッドで衝突を強制的に無視させ、トリガーを抜けると衝突を元に戻します。",
        "OneWayPlatform.cs · 접근 방향 내적으로 통과 여부 결정":
            "OneWayPlatform.cs・接近方向の内積で通過の可否を決定",
        "Spline 기반 Z축 이동":
            "Splineを用いたZ軸移動",
        "사이드뷰 스테이지에서 앞뒤 공간으로 넘어가는 이동입니다. 존에 진입하면 Unity Splines의 경로를 정규화된 시간으로 훑으면서 플레이어 위치를 옮기고, 같은 지점의 탄젠트를 구해 진행 방향을 바라보게 합니다. 역방향은 시간을 거꾸로 흘리고 탄젠트를 뒤집어 같은 경로를 그대로 재사용했습니다. 이동을 시작할 때 맵 섹션 인덱스를 옮기고 카메라를 Z 이동용 프리셋으로 전환했다가, 도착하면 이전 프리셋으로 되돌립니다.":
            "サイドビューのステージから奥や手前の空間へ移動する仕組みです。ゾーンに入るとUnity Splinesのパスを正規化された時間でたどりながらプレイヤーの位置を移動させ、同じ地点の接線を求めて進行方向を向かせます。逆方向は時間を逆に進めて接線を反転させ、同じパスをそのまま再利用しました。移動開始時にマップセクションのインデックスを移し、カメラをZ移動用プリセットに切り替えて、到着すると以前のプリセットに戻します。",
        "Spline.cs · 경로를 따라 플레이어를 이동시키는 코루틴":
            "Spline.cs・パスに沿ってプレイヤーを移動させるコルーチン",
        "몬스터 공통 Base와 Behavior Tree":
            "モンスター共通BaseとBehavior Tree",
        "Ira, Nuovo, Scopi가 각각 다르게 움직이지만 판정 기준과 상태 전환은 같아야 했습니다. 그래서 추상 클래스 MonsterBase에 이동·공격·스턴·탐지 범위 판정 같은 공통 계약을 선언하고 몬스터별 클래스가 이를 구현하도록 했습니다. Behavior Tree 노드는 몬스터를 직접 움직이지 않고, 블랙보드로 받은 MonsterBase에 플래그와 목표 위치만 넘깁니다. 실제 이동은 몬스터 쪽이 처리하므로 트리를 수정해도 몬스터 구현은 건드리지 않아도 됩니다.":
            "Ira、Nuovo、Scopiはそれぞれ動きが異なりますが、判定基準と状態遷移は揃える必要がありました。そこで抽象クラスMonsterBaseに移動・攻撃・スタン・探知範囲判定といった共通の契約を宣言し、モンスターごとのクラスがそれを実装するようにしました。Behavior Treeのノードはモンスターを直接動かさず、ブラックボードから受け取ったMonsterBaseにフラグと目標位置だけを渡します。実際の移動はモンスター側が処理するため、ツリーを修正してもモンスターの実装に手を入れる必要がありません。",
        "MonsterBase.cs · 몬스터가 구현해야 할 공통 계약":
            "MonsterBase.cs・モンスターが実装すべき共通の契約",
        "ChaseAction.cs · 이동을 직접 하지 않고 플래그만 넘기는 BT 노드":
            "ChaseAction.cs・移動を直接行わずフラグだけを渡すBTノード",
        "ScriptableObject 카메라 프리셋":
            "ScriptableObjectによるカメラプリセット",
        "전투, Z축 이동, 컷신처럼 상황마다 필요한 카메라 값이 달라서 설정을 ScriptableObject 프리셋으로 분리했습니다. 카메라 거리, 화면상 위치, 데드존, 타겟 오프셋 같은 값마다 사용 여부 토글을 두어 프리셋이 지정한 항목만 덮어쓰고 나머지는 현재 값을 유지하게 했습니다. 전환 커브와 시간도 프리셋에 함께 담아 상황이 바뀔 때 카메라가 튀지 않고 넘어가도록 했습니다. 덕분에 새로운 연출은 코드 수정 없이 프리셋 에셋을 만들어 트리거에 연결하는 것으로 끝납니다.":
            "戦闘、Z軸移動、カットシーンなど状況ごとに必要なカメラの値が異なるため、設定をScriptableObjectのプリセットとして分離しました。カメラ距離、画面上の位置、デッドゾーン、ターゲットオフセットといった値ごとに使用可否のトグルを設け、プリセットが指定した項目だけを上書きして残りは現在の値を維持するようにしています。遷移カーブと時間もプリセットに含め、状況が変わってもカメラが飛ばずに繋がるようにしました。そのため新しい演出は、コードを変更せずプリセットアセットを作ってトリガーに紐づけるだけで済みます。",
        "CameraSettings.cs · 항목별 사용 여부를 가진 카메라 프리셋":
            "CameraSettings.cs・項目ごとに使用可否を持つカメラプリセット",
        "아래 코드는 실제 프로젝트에서 발췌했습니다. 제가 작성한 커밋만 따로 추출해 공개한 저장소 github.com/aldkl/dear-my-prince-ta-work 에서 전체 구현을 볼 수 있습니다.":
            "以下のコードは実際のプロジェクトから抜粋したものです。私が書いたコミットだけを抽出して公開したリポジトリ github.com/aldkl/dear-my-prince-ta-work で全体の実装を確認できます。",
        "상": "上",
        "중": "中",
        "하": "下",
        "청강대 졸업작품에 들어가는 물 쉐이더에서 캐주얼한 foam 파트를 추가한 작업입니다.":
            "チョンガン文化産業大学の卒業制作で使用するウォーターシェーダーに、カジュアルなフォーム表現を追加しました。",
        "Git·GitHub와 배포": "Git・GitHubとデプロイ",
        "배칭과 렌더링 최적화": "バッチングとレンダリング最適化",
        "게임 상태와 공용 데이터를 관리하는 싱글턴 매니저를 구성하고, 씬이 바뀌어도 필요한 상태를 유지할 수 있습니다.":
            "ゲーム状態と共有データを管理するシングルトンマネージャーを構成し、シーンが変わっても必要な状態を維持できます。",
        "상태 기반 게임 로직": "状態ベースのゲームロジック",
        "이동, 상호작용, 퍼즐, 충돌, 저장과 불러오기, 비동기 씬 전환 등 플레이 흐름에 필요한 기능을 연결할 수 있습니다.":
            "移動、インタラクション、パズル、衝突判定、セーブ・ロード、非同期シーン遷移など、ゲームプレイに必要な機能を連携できます。",
        "게임과 도구의 저장소를 관리하고, GitHub Pages 배포, 프론트엔드와 API 서버 분리, 다국어 README와 라이선스 문서화를 할 수 있습니다.":
            "ゲームやツールのリポジトリを管理し、GitHub Pagesへのデプロイ、フロントエンドとAPIサーバーの分離、多言語READMEとライセンス文書の整備ができます。",
        "캐릭터를 회전하며 확인한 Rim Light 적용 결과":
            "キャラクターを回転させて検証したリムライトの適用結果",
        "광원과 캐릭터 방향 변화에 따른 SDF 얼굴 그림자 결과":
            "光源とキャラクター方向の変化に応じたSDF顔シャドウの結果",
        "실제 플레이에서 가림 오브젝트가 거리 기반으로 디더링되는 결과":
            "実際のプレイ中に遮蔽物へ適用した距離ベースのディザリング結果",
        "직접 제작한 애니메이션 결과": "制作したアニメーション作品",
        "착지·슬라이딩·점프로 이어지는 플레이어 벽점프 애니메이션":
            "着地・スライディング・ジャンプへとつながるプレイヤーの壁ジャンプアニメーション",
        "플레이어 비전투 Idle 애니메이션": "プレイヤーの非戦闘時Idleアニメーション",
        "몬스터 Scopi 걷기 애니메이션": "モンスターScopiの歩行アニメーション",
        "몬스터 Scopi 캐치 애니메이션": "モンスターScopiのキャッチアニメーション",
        "Blend Tree 좌우 방향 전환": "Blend Treeによる左右方向の切り替え",
        "사이드뷰에서 캐릭터를 회전해 뒷모습이 보이는 문제를 해결하기 위해 좌·우 애니메이션을 Blend Tree로 연결했습니다. 이동 방향에 따라 bLeftTrue 값을 0 또는 1로 전달해 해당 방향의 애니메이션을 재생합니다.":
            "サイドビューでキャラクターを回転させた際に背面が見える問題を解決するため、左右のアニメーションをBlend Treeで接続しました。移動方向に応じてbLeftTrueへ0または1を渡し、対応する方向のアニメーションを再生します。",
        "Unity Animator에서 좌·우 달리기 애니메이션을 연결한 Blend Tree":
            "Unity Animatorで左右の走行アニメーションを接続したBlend Tree",
        "이동 방향에 따라 Blend Tree 파라미터를 전환하는 코드":
            "移動方向に応じてBlend Treeパラメータを切り替えるコード",
        "Blend Tree를 적용한 캐릭터 좌·우 방향 전환 결과":
            "Blend Treeを適用したキャラクターの左右方向切り替え結果",
    },
}


class VisibleTextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = set()

    def handle_data(self, data):
        value = " ".join(data.split())
        if value and KOREAN.search(value):
            self.values.add(value)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {"alt", "title", "aria-label", "content"} and value and KOREAN.search(value):
                self.values.add(" ".join(value.split()))


def collect_source_copy():
    values = set()
    for path in SOURCE_FILES:
        source = path.read_text(encoding="utf-8")
        if path.suffix == ".html":
            parser = VisibleTextParser()
            parser.feed(source)
            values.update(parser.values)
        else:
            # 템플릿 리터럴은 코드 스니펫 원문이므로 번역 대상에서 제외한다.
            source = TEMPLATE_LITERAL.sub("``", source)
        for match in STRING.finditer(source):
            value = bytes(match.group(1), "utf-8").decode("unicode_escape") if "\\" in match.group(1) else match.group(1)
            value = " ".join(value.split())
            if value and KOREAN.search(value) and not value.startswith(("http://", "https://")):
                values.add(value)
    return sorted(values)


def translate(value, target):
    query = urllib.parse.urlencode({
        "client": "gtx",
        "sl": "ko",
        "tl": target,
        "dt": "t",
        "q": value,
    })
    request = urllib.request.Request(
        f"https://translate.googleapis.com/translate_a/single?{query}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.load(response)
            break
        except urllib.error.HTTPError as error:
            # 번역 API가 429를 돌려주면 잠시 기다렸다가 다시 시도한다.
            if error.code != 429 or attempt == 4:
                raise
            time.sleep(2 ** attempt)
    translated = "".join(part[0] for part in payload[0] if part[0])
    for source, replacement in POLISH[target].items():
        translated = translated.replace(source, replacement)
    return translated


def load_previous():
    """이전에 생성한 번역을 읽어 온다. 한국어 원문이 키이므로 원문이 바뀐 항목은 자연히 빠진다."""
    path = ROOT / "scripts" / "locales.js"
    if not path.exists():
        return {"en": {}, "ja": {}}
    text = path.read_text(encoding="utf-8")
    try:
        data = json.loads(text[text.index("{"):text.rindex("}") + 1])
    except ValueError:
        return {"en": {}, "ja": {}}
    return {language: data.get(language, {}) for language in ("en", "ja")}


def main():
    values = collect_source_copy()
    previous = load_previous()
    translations = {"en": {}, "ja": {}}

    # 이미 번역된 문구는 다시 요청하지 않는다.
    for language in ("en", "ja"):
        for value in values:
            if value in MANUAL_TRANSLATIONS[language]:
                continue
            if value in previous[language]:
                translations[language][value] = previous[language][value]

    jobs = [
        (value, language)
        for value in values
        for language in ("en", "ja")
        if value not in translations[language]
    ]

    def run(job):
        value, language = job
        translated = MANUAL_TRANSLATIONS[language].get(value) or translate(value, language)
        return value, language, translated

    with ThreadPoolExecutor(max_workers=3) as executor:
        for value, language, translated in executor.map(run, jobs):
            translations[language][value] = html.unescape(translated)

    output = "window.PORTFOLIO_LOCALES = " + json.dumps(
        translations, ensure_ascii=False, indent=2, sort_keys=True
    ) + ";\n"
    (ROOT / "scripts" / "locales.js").write_text(output, encoding="utf-8")
    print(f"Generated {len(values)} source strings in English and Japanese ({len(jobs)} newly translated).")


if __name__ == "__main__":
    main()
