window.PORTFOLIO_CONTENT = {
  "dear-my-prince": [
    { type: "h3", text: "PM 및 통합 작업" },
    { type: "p", text: "PM으로 파트별 진행 상황과 일정을 확인하고 작업 우선순위를 조율했습니다. 프로그래밍, 애니메이션, 쉐이더, 이펙트, 사운드 결과물이 한 플레이 흐름에서 동작하도록 테스트와 통합 작업을 함께 진행했습니다." },
    { type: "h3", text: "플레이어와 게임 로직" },
    { type: "p", text: "플레이어의 기본 공격 콤보와 대쉬 공격, 피격 무적, 벽 감지와 벽 이동, 아래 점프를 구현했습니다. Spline을 이용한 앞뒤 Z축 이동과 진입 방향에 따라 통과 여부를 판단하는 One Way Platform, 부서지는 벽과 낙하 시 리스폰 같은 스테이지 기믹도 제작했습니다." },
    { type: "p", text: "몬스터 공통 Base와 BT 구조를 만들고 Ira, Nuovo, Scopi의 이동·추적·공격·스턴·캐치·그로기 상태를 연결했습니다. 카메라 매니저, ScriptableObject 기반 카메라 설정, 바운더리와 타겟 그룹을 구현하고 Z축 이동과 전투 상황에 맞춰 카메라 동작을 조정했습니다." },
    { type: "p", text: "아래 코드는 실제 프로젝트에서 발췌했습니다. 제가 작성한 커밋만 따로 추출해 공개한 저장소 github.com/aldkl/dear-my-prince-ta-work 에서 전체 구현을 볼 수 있습니다." },

    { type: "h4", text: "공격 콤보 · 애니메이션 클립 이벤트로 입력 구간 제어" },
    { type: "p", text: "콤보 입력을 받는 구간의 시작과 끝을 공격 애니메이션 클립에 이벤트로 심었습니다. 입력 구간이 열려 있는 동안 공격 키를 누르면 다음 콤보를 예약해 두고, 클립 뒤쪽에 심어 둔 이벤트가 예약된 공격을 바로 이어서 재생합니다. 경과 시간 대신 클립 이벤트를 기준으로 삼았기 때문에 애니메이션 길이가 바뀌어도 코드에서 타이밍 값을 다시 맞출 필요가 없습니다. 대쉬 중이거나 Spline 이동 중일 때는 입력 자체를 받지 않도록 막았습니다." },
    { type: "code", lang: "csharp", caption: "AttackSystem.cs · 콤보 입력 예약과 다음 공격 연결", text: `// Assets/Scripts/Move/AttackSystem.cs
private void Update()
{
    // 일반 공격 입력 처리
    if (inputHandler.AttackRequested)
    {
        if (dashSystem.IsDashing || movementPhysics.IsSpline)
        {
            return;
        }
        // 현재 공격 중이고 콤보 가능 시간 내에 있다면
        if (isAttacking && isCanCombo && currentComboCount < maxComboCount)
        {
            isComboRequested = true;
            isCanCombo = false;
        }
        // 새로운 공격 시작 조건
        else if (canAttack && !isAttacking && groundDetector.IsGrounded)
        {
            StartAttack();
        }
    }
    // ...
}

public void AniEventAttackComboStart()
{
    isCanCombo = true;
}

public void AniEventAttackComboEnd()
{
    isCanCombo = false;
}

public void AniEventAttackComboNext()
{
    // 콤보 요청이 있으면 즉시 다음 공격 시작
    if (isComboRequested && currentComboCount <= maxComboCount)
    {
        StartAttack();
        isComboRequested = false;
    }
}` },

    { type: "h4", text: "피격 무적 · 중첩을 견디는 카운터 방식" },
    { type: "p", text: "무적 상태를 bool 하나로 두면 피격 무적이 끝나는 순간 다른 곳에서 건 무적까지 같이 풀리는 문제가 있습니다. 그래서 무적을 정수 카운터로 관리해 무적을 건 쪽이 각자 올리고 내리도록 했습니다. 카운터가 0보다 크면 피격 판정을 무시하므로, 피격 무적과 아이템 효과가 겹쳐도 서로의 상태를 덮어쓰지 않습니다. 피격 처리는 넉백과 입력 잠금, 피격 애니메이션을 함께 실행하고 무적 시간 동안 캐릭터를 깜빡이게 합니다." },
    { type: "code", lang: "csharp", caption: "Player.cs · 카운터 기반 무적과 피격 처리", text: `// Assets/Scripts/InGameObjects/Player/Player.cs
public bool TakeDamage(int damage, Vector3 attackFrom)
{
    if (isInvincibleCount > 0 || IsDead)
        return false;

    ApplyDamageEffects(attackFrom);
    // ... 방어 장식 아이템 보정 ...
    ApplyDamage(damage);

    if (IsDead)
    {
        Die();
        return true;
    }

    StartHitInvincibility().Forget();
    UpdateHealthUI();
    return false;
}

private async UniTaskVoid StartHitInvincibility()
{
    StartInvincibility();
    PlayInvincibilityEffect();
    await UniTask.Delay(TimeSpan.FromSeconds(invincibilityDuration));
    EndHitInvincibility();
}

public void StartInvincibility() {
    isInvincibleCount++;
}

public void EndInvincibility() {
    if (isInvincibleCount > 0) {
        isInvincibleCount--;
    }
}` },

    { type: "h4", text: "One Way Platform · 진입 방향으로 통과 판정" },
    { type: "p", text: "아래에서 올라올 때는 통과하고 위에서 밟을 때는 막아야 하는 발판입니다. 플레이어가 트리거에 들어온 순간의 Rigidbody 속도를 접근 방향으로 삼고, 속도가 거의 없으면 위치 차이로 방향을 구합니다. 그 방향과 발판에 설정한 진입 방향을 내적해 반대쪽에서 접근한 경우에만 Physics.IgnoreCollision으로 충돌을 꺼 줍니다. 아래 점프는 별도 메서드로 충돌을 강제로 무시하게 만들고, 트리거를 벗어나면 충돌을 되돌립니다." },
    { type: "code", lang: "csharp", caption: "OneWayPlatform.cs · 접근 방향 내적으로 통과 여부 결정", text: `// Assets/Scripts/InGameObjects/Objects/OneWayPlatform.cs
public void HandleTriggerEnter(Collider other)
{
    if (other.CompareTag("Player") && !allowPlayerToPass)
    {
        Rigidbody rb = other.attachedRigidbody;
        if (rb == null) return;

        playerCollider = other;

        Vector3 approachDirection;

        // 속도로 방향 파악, 속도가 너무 낮으면 위치 기반으로 판단
        if (rb.linearVelocity.magnitude > 0.1f)
        {
            approachDirection = -rb.linearVelocity.normalized;
        }
        else
        {
            approachDirection = (other.bounds.center - transform.position).normalized;
        }

        playerToPass = CheckShouldPassPlatform(approachDirection);

        Physics.IgnoreCollision(collider, other, playerToPass);
    }
}

private bool CheckShouldPassPlatform(Vector3 approachDirection)
{
    Vector3 platformDirection = GetPlatformDirection();
    float dot = Vector3.Dot(platformDirection, approachDirection);

    // 엔트리 방향의 반대 방향에서 접근하면 통과 허용
    return dot < -entryThreshold;
}

// 아래 점프용 메서드 - 플레이어 충돌 상태를 무조건 통과로 설정
public void IgnorePlatformCollision(Collider other)
{
    // 충돌 상태를 통과로 설정
    allowPlayerToPass = true;
    // 즉시 적용
    Physics.IgnoreCollision(collider, other, true);
}` },

    { type: "h4", text: "Spline 기반 Z축 이동" },
    { type: "p", text: "사이드뷰 스테이지에서 앞뒤 공간으로 넘어가는 이동입니다. 존에 진입하면 Unity Splines의 경로를 정규화된 시간으로 훑으면서 플레이어 위치를 옮기고, 같은 지점의 탄젠트를 구해 진행 방향을 바라보게 합니다. 역방향은 시간을 거꾸로 흘리고 탄젠트를 뒤집어 같은 경로를 그대로 재사용했습니다. 이동을 시작할 때 맵 섹션 인덱스를 옮기고 카메라를 Z 이동용 프리셋으로 전환했다가, 도착하면 이전 프리셋으로 되돌립니다." },
    { type: "code", lang: "csharp", caption: "Spline.cs · 경로를 따라 플레이어를 이동시키는 코루틴", text: `// Assets/Scripts/InGameObjects/Objects/Spline.cs
private IEnumerator MoveAlongSpline(bool isForward)
{
    float startTime = isForward ? 0f : duration;
    float endTime = isForward ? duration : 0f;
    float currentTime = startTime;

    while ((isForward && currentTime < endTime) || (!isForward && currentTime > endTime))
    {
        // 정규화된 시간 계산 (0~1 사이)
        float normalizedTime = currentTime / duration;

        // 스플라인 상의 위치 계산
        Vector3 position = splineContainer.EvaluatePosition(normalizedTime);
        playerObject.transform.position = position;

        // 스플라인의 방향을 바라보도록 설정
        Vector3 tangent = splineContainer.EvaluateTangent(normalizedTime);
        if (tangent != Vector3.zero)
        {
            // 역방향일 경우 탄젠트 방향 반전
            if (!isForward) tangent = -tangent;
            playerObject.transform.forward = tangent;
        }

        // 시간 업데이트
        currentTime += (isForward ? Time.deltaTime : -Time.deltaTime);

        yield return null;
    }

    // ... 도착 위치 보정, 콜라이더 복구, 맵 섹션 갱신 ...
    CameraManager.Instance.ApplySettings(CameraManager.Instance.GetPreviousSetting());
}` },

    { type: "h4", text: "몬스터 공통 Base와 Behavior Tree" },
    { type: "p", text: "Ira, Nuovo, Scopi가 각각 다르게 움직이지만 판정 기준과 상태 전환은 같아야 했습니다. 그래서 추상 클래스 MonsterBase에 이동·공격·스턴·탐지 범위 판정 같은 공통 계약을 선언하고 몬스터별 클래스가 이를 구현하도록 했습니다. Behavior Tree 노드는 몬스터를 직접 움직이지 않고, 블랙보드로 받은 MonsterBase에 플래그와 목표 위치만 넘깁니다. 실제 이동은 몬스터 쪽이 처리하므로 트리를 수정해도 몬스터 구현은 건드리지 않아도 됩니다." },
    { type: "code", lang: "csharp", caption: "MonsterBase.cs · 몬스터가 구현해야 할 공통 계약", text: `// Assets/Scripts/InGameObjects/Monsters/MonsterBase.cs
// 몬스터의 기본 상태를 관리하는 추상 클래스
public abstract class MonsterBase : MonoBehaviour
{
    protected MonsterFSM monsterFSM;
    protected BehaviorGraphAgent agent;
    // ...

    public abstract void Die();
    public abstract void Move();
    public abstract void Attack(int attackType);
    public abstract void Stun(float duration);
    public abstract bool CheckPlayerInDetectionRange();
    public abstract bool CheckPlayerInAttackRange();
    public abstract bool CheckIsInSpawnPosition();
    public abstract void LookSide(Vector3 isLeft);
    public abstract void RotateTo(Vector3 targetDirection);
    public abstract bool ReturnToOriginalPosition();
    public abstract float GetDistanceToPlayer(Vector3 Checkpos);
    // ...
}` },
    { type: "code", lang: "csharp", caption: "ChaseAction.cs · 이동을 직접 하지 않고 플래그만 넘기는 BT 노드", text: `// Assets/Scripts/Behavior/BehaviorNodes/Actions/ChaseAction.cs
[Serializable, GeneratePropertyBag]
[NodeDescription(name: "Chase", story: "Set [Self] [IsChsing] and Update [Target]", category: "Action",
    id: "9dc876c3cba100890cc314fe4e326965")]
public partial class ChaseAction : Action
{
    [SerializeReference] public BlackboardVariable<MonsterBase> Self;
    [SerializeReference] public BlackboardVariable<GameObject> Target;
    [SerializeReference] public BlackboardVariable<bool> IsChasing;

    protected override Status OnUpdate()
    {
        if (Self.Value != null && Target.Value != null)
        {
            // 직접 이동하는 대신 플래그만 설정
            Self.Value.IsChasing = IsChasing;
            Self.Value.SetTargetPosition(Target.Value.transform.position);

            return Status.Success; // 계속 실행 중
        }

        return Status.Failure;
    }
}` },

    { type: "h4", text: "ScriptableObject 카메라 프리셋" },
    { type: "p", text: "전투, Z축 이동, 컷신처럼 상황마다 필요한 카메라 값이 달라서 설정을 ScriptableObject 프리셋으로 분리했습니다. 카메라 거리, 화면상 위치, 데드존, 타겟 오프셋 같은 값마다 사용 여부 토글을 두어 프리셋이 지정한 항목만 덮어쓰고 나머지는 현재 값을 유지하게 했습니다. 전환 커브와 시간도 프리셋에 함께 담아 상황이 바뀔 때 카메라가 튀지 않고 넘어가도록 했습니다. 덕분에 새로운 연출은 코드 수정 없이 프리셋 에셋을 만들어 트리거에 연결하는 것으로 끝납니다." },
    { type: "code", lang: "csharp", caption: "CameraSettings.cs · 항목별 사용 여부를 가진 카메라 프리셋", text: `// Assets/Scripts/Camera/Cameramanagers/CameraSettings.cs
[CreateAssetMenu(fileName = "CameraSetting", menuName = "ScriptableObjects/Camera Setting Preset")]
public class CameraSettings : ScriptableObject
{
    [System.Serializable]
    public class PositionComposerSettings
    {
        [Header("Camera Distance")]
        public bool useCameraDistance = false;
        [ConditionalHide("useCameraDistance")]
        public float cameraDistance = 8f;

        [Header("Composition - Screen Position")]
        public bool useScreenPosition = false;
        [ConditionalHide("useScreenPosition")]
        public Vector2 screenPosition = Vector2.zero;

        [Header("Composition - Dead Zone")]
        public bool useDeadZone = false;
        [ConditionalHide("useDeadZone")]
        public Vector2 deadZoneSize = Vector2.zero;

        [Header("Target Tracking")]
        public bool useTargetOffset = false;
        [ConditionalHide("useTargetOffset")]
        public Vector3 targetOffset;
        // ...
    }

    [System.Serializable]
    public class TransitionSettings
    {
        public bool useTransitionSettings = false;
        [ConditionalHide("useTransitionSettings")]
        public AnimationCurve transitionCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
        [ConditionalHide("useTransitionSettings")]
        [Range(0f, 5f)] public float duration = 0.5f;
    }

    [Header("Position Composer Settings")]
    public PositionComposerSettings composerSettings = new PositionComposerSettings();

    [Header("Transition Settings")]
    public TransitionSettings transitionSettings = new TransitionSettings();
    // ...
}` },
    { type: "h3", text: "애니메이션 제작 및 시스템" },
    { type: "p", text: "기존 커스텀 애니메이션 방식을 Unity Animator 기반으로 전환하고, 좌우 방향 애니메이션을 Blend Tree로 연결했습니다. 플레이어 공격·대쉬·점프·랜딩과 몬스터 애니메이션을 적용하고 이벤트 연결과 전환 버그를 수정했습니다." },
    { type: "p", text: "직접 제작한 애니메이션에는 플레이어 벽점프의 착지·슬라이딩·점프 동작, 비전투 Idle, Scopi의 걷기와 캐치, 부서지는 벽 동작이 포함됩니다. 벽점프는 착지부터 슬라이딩 준비, 루프, 점프까지 한 흐름으로 제작하고 발 위치와 허리·목 각도, 재생 속도를 폴리싱했습니다." },
    { type: "h3", text: "Blend Tree 좌우 방향 전환" },
    { type: "p", text: "사이드뷰에서 캐릭터를 회전해 뒷모습이 보이는 문제를 해결하기 위해 좌·우 애니메이션을 Blend Tree로 연결했습니다. 이동 방향에 따라 bLeftTrue 값을 0 또는 1로 전달해 해당 방향의 애니메이션을 재생합니다." },
    { type: "image", src: "assets/works/dear-my-prince/blend-tree-node.png", caption: "Unity Animator에서 좌·우 달리기 애니메이션을 연결한 Blend Tree" },
    { type: "image", src: "assets/works/dear-my-prince/blend-tree-control.png", caption: "이동 방향에 따라 Blend Tree 파라미터를 전환하는 코드" },
    { type: "video", src: "assets/works/dear-my-prince/blend-tree-result.mp4", poster: "assets/works/dear-my-prince/blend-tree-result.jpg", caption: "Blend Tree를 적용한 캐릭터 좌·우 방향 전환 결과" },
    { type: "h3", text: "직접 제작한 애니메이션 결과" },
    { type: "video", src: "assets/works/dear-my-prince/animation-wall-jump.mp4", poster: "assets/works/dear-my-prince/animation-wall-jump.jpg", caption: "착지·슬라이딩·점프로 이어지는 플레이어 벽점프 애니메이션" },
    { type: "video", src: "assets/works/dear-my-prince/animation-idle.mp4", poster: "assets/works/dear-my-prince/animation-idle.jpg", caption: "플레이어 비전투 Idle 애니메이션" },
    { type: "video", src: "assets/works/dear-my-prince/animation-scopi-walk.mp4", poster: "assets/works/dear-my-prince/animation-scopi-walk.jpg", caption: "몬스터 Scopi 걷기 애니메이션" },
    { type: "video", src: "assets/works/dear-my-prince/animation-scopi-catch.mp4", poster: "assets/works/dear-my-prince/animation-scopi-catch.jpg", caption: "몬스터 Scopi 캐치 애니메이션" },
    { type: "h3", text: "URP 툰 쉐이더 및 그래픽 기술" },
    { type: "p", text: "캐릭터와 배경에 사용할 URP 툰 쉐이더를 제작했습니다. Toon Lighting과 Outline Pass를 구성하고 색상, 명암 단계, Specular, Normal, Outline을 머티리얼에서 조절할 수 있도록 만들었습니다." },
    { type: "image", src: "assets/works/dear-my-prince/face-sdf.png", caption: "빛 방향과 SDF 맵을 이용한 얼굴 그림자 계산" },
    { type: "p", text: "엔티티용 메인 셰이더인 SrokaURPEntityToon.shader에 Toon Lighting, Outline, SDF 얼굴 그림자, Normal, Specular와 Rim Light 기능을 통합했습니다. 기능별 사용 여부와 색상·강도·임계값을 머티리얼에서 조절할 수 있도록 구성하고 불필요한 분기를 줄였습니다." },
    { type: "image", src: "assets/works/dear-my-prince/rim-light.png", caption: "깊이와 Fresnel을 이용한 Rim Light 계산" },
    { type: "image", src: "assets/works/dear-my-prince/entity-toon-rim-light.png", caption: "SrokaURPEntityToon.shader의 Rim Light 파라미터" },
    { type: "video", src: "assets/works/dear-my-prince/rim-light-result.mp4", poster: "assets/works/dear-my-prince/rim-light-result.jpg", caption: "캐릭터를 회전하며 확인한 Rim Light 적용 결과" },
    { type: "video", src: "assets/works/dear-my-prince/sdf-face-shadow-result.mp4", poster: "assets/works/dear-my-prince/sdf-face-shadow-result.jpg", caption: "광원과 캐릭터 방향 변화에 따른 SDF 얼굴 그림자 결과" },
    { type: "p", text: "카메라와 플레이어 사이를 가리는 벽에는 거리 기반 Dithering을 추가하고, 필요하면 슬라이더 값으로 전체 투명도를 제어할 수 있게 했습니다. 이외에도 월드 기준 랜덤 바닥 타일링, 물 쉐이더, 라이팅과 머티리얼 조정 작업을 진행했습니다." },
    { type: "image", src: "assets/works/dear-my-prince/dithering.png", caption: "카메라 거리 기반 Dithering 처리" },
    { type: "video", src: "assets/works/dear-my-prince/dithering-result.mp4", poster: "assets/works/dear-my-prince/dithering-result.jpg", caption: "실제 플레이에서 가림 오브젝트가 거리 기반으로 디더링되는 결과" },
    { type: "h3", text: "이펙트 및 사운드" },
    { type: "p", text: "플레이어 공격과 몬스터 피격·스턴 이펙트를 적용하고 위치, 크기, 재생 타이밍과 Lifetime을 조정했습니다. 애니메이션 이벤트와 공격 시스템이 이펙트를 정확한 프레임에 호출하도록 연결했습니다." },
    { type: "p", text: "FMOD Manager를 인터페이스 기반으로 구성하고 Unity 프로젝트에 연동했습니다. Audio Type별 볼륨과 BGM 목록을 관리하고 플레이어와 몬스터의 공격, 대쉬, 캐치, 피격 등 SFX를 애니메이션 및 게임 로직에 연결했습니다." },
  ],
  "flower-girl": [
    { type: "h3", text: "PD와 TA 역할" },
    { type: "p", text: "PD로 게임의 핵심 경험을 '쓰레기를 빨아들여 치우고, 정화된 숲을 바라보며 뿌듯함을 느낀다'는 한 문장으로 정리하고 팀의 콘텐츠 범위를 조율했습니다. TA로는 이 경험을 화면에 보여 주는 정화 연출 쉐이더와 강물 쉐이더, 폭발 열매 연출을 직접 제작했습니다. 아래 내용은 팀 저장소의 제 커밋 기록을 기준으로 정리했습니다. 프로젝트의 쉐이더는 HLSL 코드 파일이 아니라 Unreal Engine 5 머티리얼 그래프와 머티리얼 함수로 제작했기 때문에, 코드 대신 그래프의 구성 요소와 연동 코드를 적었습니다." },

    { type: "h3", text: "정화 연출 · 흑백 세계가 색을 되찾는 쉐이더" },
    { type: "p", text: "오염된 숲은 흑백으로 보이고, 플레이어가 청소한 만큼 색이 돌아오는 것이 게임의 핵심 시각 규칙이었습니다. 숲 전체를 다시 칠해야 하는 효과라서 오브젝트마다 다이내믹 머티리얼 인스턴스를 만드는 방식은 비용이 컸습니다. 그래서 반지름 값 하나를 MaterialParameterCollection에 두고, 포스트프로세스 머티리얼과 모든 오브젝트 머티리얼이 같은 값을 읽게 했습니다. 값 하나를 바꾸면 화면 후처리와 나무·꽃·쓰레기 표면이 동시에 반응합니다." },
    { type: "code", lang: "text", caption: "M_PPBlackWorld · 포스트프로세스 머티리얼 그래프 구성 (에셋에서 추출한 노드·파라미터 목록)", text: `Domain        : PostProcess
Blendable     : Color / Normal / Roughness 이후
Parameter     : G_Radius  (MaterialParameterCollection M_PA_BlackWorld)

SceneTexture(PostProcessInput0)  ──▶ Desaturation(Fraction) ──┐
                                                               ├─▶ Lerp(A: 흑백, B: 원본, Alpha: Mask) ──▶ Emissive
WorldPosition ─┐                                               │
CameraPositionWS ─┴─▶ SphereMask(Radius = G_Radius) ──▶ Mask ──┘

SceneTexture(CustomStencil) ──▶ If(A > B / A == B / A < B)
   → 스텐실 값에 따라 특정 오브젝트를 흑백 처리에서 제외하거나 강제 포함

DefaultEngine.ini
[/Script/Engine.RendererSettings]
r.CustomDepth=3      ; Custom Depth-Stencil 활성화 (같은 커밋에서 변경)` },
    { type: "p", text: "포스트프로세스만으로는 투명 재질과 식생이 평평하게 보여서, 표면 쪽에도 같은 반지름을 읽는 마스터 머티리얼을 만들었습니다. 텍스처가 없는 메시도 같은 마스터를 쓸 수 있도록 1×1 흰색 유틸리티 텍스처를 추가했고, 꽃·잎·나무 인스턴스 3종을 만들어 꽃과 풀 11종, 잎·나무·그루터기 13종, 쓰레기 14종 블루프린트에 직접 교체 적용했습니다. 다음 날 팀원이 이 머티리얼 위에 정화 연출을 확장해 최종 빌드에 들어갔습니다." },
    { type: "code", lang: "text", caption: "M_BlackObject · 오브젝트 표면용 마스터 머티리얼과 인스턴스", text: `Parameters
  DiffuseColor : Texture2D
  MixColor     : Vector
  G_Radius     : CollectionParameter (M_PA_BlackWorld)  ← 포스트프로세스와 동일한 값

TextureSample(DiffuseColor) × MixColor ──▶ Desaturation(Fraction ← G_Radius 기반) ──▶ BaseColor

Instances (블랙 BP 수정 커밋)
  MI_Black_flower : DiffuseColor = T_color
  MI_Black_leaf   : DiffuseColor = White(1×1), MixColor 지정
  MI_Black_wood   : DiffuseColor = White(1×1), MixColor 지정` },

    { type: "h3", text: "강물 쉐이더 · 거리 필드 기반 가장자리 거품" },
    { type: "p", text: "손그림 톤에 맞는 강물이 필요했고, 강에 놓이는 바위나 통나무 위치가 계속 바뀌어서 거품 마스크를 손으로 그릴 수 없었습니다. 글로벌 거리 필드에서 가장 가까운 표면까지의 거리를 읽어 가장자리 거품과 얕은 물 색을 자동으로 만들고, 흐름 방향도 장애물 주변에서 꺾이게 했습니다. 스크롤 텍스처가 반복되어 보이는 문제는 시간차를 둔 두 UV 샘플을 교차 페이드하는 UV 믹서로 없앴습니다. 기능은 다섯 개의 머티리얼 함수로 나누고, 변위·흐름 마스크·굴절·거리 필드 감지를 스태틱 스위치로 켜고 끌 수 있게 해서 저사양 변형도 만들 수 있게 했습니다." },
    { type: "code", lang: "text", caption: "M_RiverMaster · 머티리얼 함수 구성과 노출 파라미터", text: `Blend: Translucent / Lighting: Volumetric NonDirectional / Refraction 사용

MF_DistanceToNearestSurface  글로벌 거리 필드로 물 픽셀에서 가장 가까운 표면까지 거리 계산
MF_WaterObjectDetection      거리를 부드러운 그라디언트로 변환 → 장애물 주변 거품·흐름 보정
                             (Gradient Power / Smoothness, Alternate Direction, Invert Direction)
MF_WaterUVMixer              두 위상의 UV를 교차 페이드해 스크롤 반복 제거 (ComplexMotion)
MF_WaterSurface              깊이 그라디언트 + 거품으로 표면 색·불투명도 조립
MF_WaterSurface_Normal       노멀맵 다중 레이어 누적

노출 파라미터 (약 40개)
  Color/Opacity/Fade Distance : Shallow · Deep
  Flow UV · Intensity · Power · Flow Mask · Alternate Mask
  Normal UV · Intensity / Displacement Map · UV · Intensity · Power
  Foam Map · UV · Color / Edge Foam · Intensity · Spread
  Refraction Intensity · Fade Distance
  Static Switch: Enable Displacement / Flow Mask / Refraction / Distance Field Detection

BP_RiverSpline (레벨 디자인용 툴)
  River Width · Start Scale · End Scale → 스플라인을 따라 폭이 변하는 강 메시 생성` },

    { type: "h3", text: "폭발 열매 · 쉐이더와 C++를 함께 만든 연출" },
    { type: "p", text: "폭발 열매는 터지기 직전까지 점점 빠르게 깜빡여야 했습니다. 머티리얼에는 Emissive를 곱하는 Blinking 스칼라 하나만 노출하고, C++ Tick에서 경과 시간에 따라 깜빡임 주기가 짧아지도록 값을 계산해 넣었습니다. 초기 주기, 최소·최대 주기 같은 타이밍 값은 DataAsset으로 빼서 기획자가 코드 수정 없이 조정할 수 있게 했습니다. 아래 코드는 git blame으로 제 커밋임을 확인한 부분입니다." },
    { type: "code", lang: "cpp", caption: "GFExplosionFruit.cpp · 시간이 갈수록 빨라지는 깜빡임", text: `// Source/GirlOfFlowers/Character/Pawn/GFExplosionFruit.cpp
void AGFExplosionFruit::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if(!ExplosionFruitData)
        return;

    if(bStartExplosion)
    {
        fBlinkTime += DeltaSeconds;

        float SpeedFactor = ExplosionFruitData->MinBlinkTime + fTotalElapsedTime; // 시간이 지날수록 주기 빨라짐
        float BlinkCycleTime = ExplosionFruitData->InitialBlinkTime / SpeedFactor; // 깜빡임 주기를 변화시킴

        // 깜빡임 값을 업데이트
        if(MeshComponent)
            MeshComponent->SetScalarParameterValueOnMaterials(TEXT("Blinking"), fMaterialEmissiveValue);

        // 깜빡임 주기
        if (fBlinkTime <= BlinkCycleTime)
        {
            fMaterialEmissiveValue += DeltaSeconds * SpeedFactor; // Emissive 값을 더 빠르게 증가
        }
        else if (fBlinkTime <= 2 * BlinkCycleTime)
        {
            fMaterialEmissiveValue -= DeltaSeconds * SpeedFactor; // Emissive 값을 더 빠르게 감소
        }
        else
        {
            fBlinkTime = 0; // 주기가 끝나면 다시 0으로 초기화
        }

        // 총 흐른 시간을 기록하여 속도 증가에 사용
        fTotalElapsedTime += DeltaSeconds;
    }
}` },
    { type: "code", lang: "cpp", caption: "GFExplosionFruitData.h · DataAsset으로 노출한 깜빡임 타이밍", text: `// Source/GirlOfFlowers/Character/Data/GFExplosionFruitData.h
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = ExplosionFruit, meta = (AllowPrivateAccess = true))
float InitialBlinkTime = 0.3f;

UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = ExplosionFruit, meta = (AllowPrivateAccess = true))
float MaxBlinkTime = 1.0f;

UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = ExplosionFruit, meta = (AllowPrivateAccess = true))
float MinBlinkTime = 0.05f;

// GFExplosionFruit.h
bool  bStartExplosion = false;
float fBlinkTime = 0;
float fTotalElapsedTime = 0;
float fMaterialEmissiveValue = 0;` },

    { type: "h3", text: "돌아보며" },
    { type: "p", text: "반지름 하나를 컬렉션으로 공유하는 구조는 이후 팀의 스캔 연출에도 같은 방식으로 재사용되어 프로젝트의 기본 패턴이 되었습니다. 다만 머티리얼 그래프는 저장소에서 diff로 읽히지 않아 작업 증거가 남기 어려웠고, 이후 Unity 프로젝트에서는 URP HLSL 쉐이더로 작업해 계산 과정이 코드로 남도록 했습니다." },
  ],
  yorijori: [
    { type: "h3", text: "요리 시스템 구조" },
    { type: "p", text: "프로그래머로 요리 시스템 전반을 맡았습니다. 재료(Ingredient), 레시피(Recipe), 조리 도구(CookingTools), 접시(CookPlate), 주문대(OderDesk)로 역할을 나누고, 재료가 도구를 거치며 상태가 바뀐 뒤 접시에서 레시피와 비교되는 흐름으로 구성했습니다. 13명 팀에서 요리와 재료가 계속 늘어나는 상황이었기 때문에, 코드가 아니라 프리팹과 인스펙터 리스트만 수정해서 콘텐츠를 추가할 수 있게 만드는 것을 목표로 삼았습니다." },
    { type: "p", text: "아래 코드는 GitHub 저장소 github.com/aldkl/Yorijori 에서 발췌했습니다." },

    { type: "h4", text: "재료 상태와 레시피 · 인스펙터에서 편집하는 데이터" },
    { type: "p", text: "재료는 잘림·가열·섞임·실패 상태를 독립된 플래그로 갖고, 잘렸을 때 생성될 조각 프리팹을 함께 들고 있습니다. 레시피는 이름과 재료 프리팹 리스트만 가진 단순한 데이터라서 새 요리는 프리팹을 복제해 재료를 끌어다 놓고 GameManager의 Recipes 리스트에 등록하면 끝납니다. 실제 프로젝트에는 11개 레시피와 18개 재료가 이 방식으로 등록되어 있습니다." },
    { type: "code", lang: "csharp", caption: "Ingredient.cs · Recipe.cs · 플래그 기반 재료 상태와 리스트 기반 레시피", text: `// Assets/03_Script/System/Ingredient.cs
public class Ingredient : MonoBehaviour
{
    public string Name;
    public bool isCutting;
    public bool isFired;
    public bool isMixed;
    public bool isFailed;

    public bool isTrick;

    public GameObject CuttingObject1;
    public GameObject CuttingObject2;
    public GameObject CuttingObject3;
}

// Assets/03_Script/System/Recipe.cs
[System.Serializable]
public class Recipe : MonoBehaviour
{
    public string Name;//요리 이름
    public List<Ingredient> ingredients;

    public bool IsUnlocked { get; private set; }

    public void UnlockRecipe()
    {
        IsUnlocked = true;
    }
}` },

    { type: "h4", text: "접시 완성 판정 · 등록된 레시피와 재료 이름 비교" },
    { type: "p", text: "접시에 올라간 재료를 GameManager에 등록된 모든 레시피와 순서대로 비교합니다. 재료 이름은 공백과 대소문자를 무시하고 비교해 인스펙터 입력 실수에 견디게 했고, 탄 재료(isFailed)가 하나라도 있으면 그 레시피는 실패로 처리합니다. 판정 결과는 이름이 같은 완성 요리 오브젝트를 켜는 방식으로 표시하고, 일치하는 레시피가 없으면 0번에 예약해 둔 실패 요리를 보여 줍니다." },
    { type: "code", lang: "csharp", caption: "CookPlate.cs · 레시피 매칭과 완성 요리 표시", text: `// Assets/03_Script/System/CookPlate.cs
public void FinishCooked()
{
    OnCook.SetActive(false);

    HashSet<Ingredient> uniqueIngredients = new HashSet<Ingredient>(ingredients);
    FinishRecipe = null;

    // GameManager의 모든 레시피와 비교
    foreach (Recipe recipe in GameManager.Instance.Recipes)
    {
        bool isMatching = true;

        foreach (Ingredient recipeIngredient in recipe.ingredients)
        {
            // 이름이 일치하는 재료를 찾습니다.
            Ingredient matchingIngredient = uniqueIngredients.FirstOrDefault(
                i => i.Name.Trim().Equals(recipeIngredient.Name.Trim(), StringComparison.OrdinalIgnoreCase));

            // 일치하는 재료가 없거나, isFailed가 true인 경우 매칭 실패로 처리
            if (matchingIngredient == null || matchingIngredient.isFailed)
            {
                isMatching = false;
                break;
            }
        }
        if (isMatching)
        {
            FinishRecipe = recipe;
            IsFinished = true;
            break;
        }
    }

    if (FinishRecipe != null)
    {
        foreach (GameObject cook in Cooks)
        {
            if (cook.name == FinishRecipe.name)
            {
                cook.SetActive(true);
                GameManager.Instance.PlayEffectSound(6);
                break;
            }
        }
    }
    else
    {
        GameManager.Instance.PlayEffectSound(7);
        Cooks[0].SetActive(true);   // 실패 요리
        IsFinished = true;
    }
}` },

    { type: "h4", text: "조리 도구 · 하나의 컴포넌트로 도구별 동작 분기" },
    { type: "p", text: "칼, 냄비, 프라이팬, 국자, 믹서 같은 도구는 CookingTools 컴포넌트 하나를 공유하고 도구 이름으로 동작을 분기합니다. 재료가 도구에 들어가면 파괴하지 않고 비활성화만 해서 상태 플래그를 유지하고, 냄비 내용물은 국자에 닿으면 리스트를 복사해 넘기는 식으로 물리 오브젝트 대신 재료 목록이 도구 사이를 이동하게 했습니다." },
    { type: "code", lang: "csharp", caption: "CookingTools.cs · 도구 이름 분기와 냄비에서 국자로 재료 이동", text: `// Assets/03_Script/System/CookingTools.cs
private void OnCollisionEnter(Collision collision)
{
    if (collision.gameObject.CompareTag("Ingredient"))
    {
        GameObject ingredient = collision.gameObject;
        switch (ToolsName)
        {
            case "Bowl":
                BowlInput(ingredient);
                break;
            case "Pot":
                PotInput(ingredient);
                break;
            case "FryingPan":
                if (ingredient.GetComponent<Ingredient>().isCutting && !ShowNowCooking.activeSelf)
                {
                    PanInput(ingredient);
                }
                break;
            case "Knife":
                KnifeCutting(ingredient);
                break;
        }
    }

    // 냄비 내용물을 국자로 옮긴다
    if (collision.gameObject.tag == "Ladle" && ToolsName == "Pot")
    {
        if (InputIngredients.Count > 0)
        {
            collision.gameObject.GetComponent<CookingTools>().InputIngredients = new List<Ingredient>(InputIngredients);
            collision.gameObject.GetComponent<CookingTools>().ShowNowCooking.SetActive(true);

            InputIngredients.Clear();
            ShowNowCooking.SetActive(false);
        }
    }
}

public void InputIngredient(Ingredient ingredientComponent)
{
    if (ingredientComponent != null)
    {
        InputIngredients.Add(ingredientComponent);
        ingredientComponent.gameObject.SetActive(false);   // 파괴하지 않고 상태를 유지
        ShowNowCooking.SetActive(true);
    }
}` },

    { type: "h4", text: "가열 타이머 · 익음과 탐을 두 단계 코루틴으로 처리" },
    { type: "p", text: "가열 도구는 재료가 들어오면 코루틴을 시작해 일정 시간 뒤 익은 상태(isFired)로 바꾸고, 그대로 두면 다시 일정 시간 뒤 탄 상태(isFailed)로 만듭니다. 새 재료가 추가되면 기존 코루틴을 멈추고 다시 시작해 플레이어가 재료를 빼야 하는 시간 창이 생기도록 했습니다. 칼은 재료를 왼쪽·가운데·오른쪽 조각 프리팹 3개로 교체하고, 자를 수 없는 기믹 재료는 이름 목록으로 제외합니다." },
    { type: "code", lang: "csharp", caption: "CookingTools.cs · 두 단계 가열 코루틴과 칼 자르기", text: `// Assets/03_Script/System/CookingTools.cs
private IEnumerator CookIngredient(GameObject Cooking)
{
    // 1단계: 재료가 익는 시간
    yield return new WaitForSeconds(5f);

    Renderer renderer = Cooking.GetComponent<Renderer>();
    if (renderer != null)
    {
        renderer.material = cookedMaterial;
        for (int i = 0; i < InputIngredients.Count; i++)
        {
            InputIngredients[i].isFired = true;
        }
    }

    // 2단계: 재료가 타는 시간
    yield return new WaitForSeconds(5f);

    if (renderer != null)
    {
        burnedMaterial.SetActive(true);
        for (int i = 0; i < InputIngredients.Count; i++)
        {
            InputIngredients[i].isFailed = true;
        }
    }

    cookingCoroutine = null;
}

public void KnifeCutting(GameObject ingredient)
{
    if (ingredient.GetComponent<Ingredient>().isCutting == false)
    {
        Ingredient ingredientComponent = ingredient.gameObject.GetComponent<Ingredient>();
        string[] excludedNames = { "Coral", "Seashell", "Eyeball", "Snail", "Moss", "Fairywings" };

        if (System.Array.IndexOf(excludedNames, ingredientComponent.Name) == -1)
        {
            Instantiate(ingredientComponent.CuttingObject1, ingredient.transform.position + new Vector3(0.3f, 0, 0), Quaternion.identity);
            Instantiate(ingredientComponent.CuttingObject2, ingredient.transform.position, Quaternion.identity);
            Instantiate(ingredientComponent.CuttingObject3, ingredient.transform.position + new Vector3(-0.3f, 0, 0), Quaternion.identity);

            GameManager.Instance.PlayEffectSound(4);
            Destroy(ingredientComponent.gameObject);
        }
    }
}` },

    { type: "h4", text: "손님별 재료 배치 · 테이블 한 장으로 난이도 조절" },
    { type: "p", text: "손님 순서마다 6개 재료 상자에 어떤 재료가 들어갈지 정수 테이블로 정했습니다. 등록된 18개 재료 중 인덱스만 적으면 되기 때문에 보스 손님 전에 기믹 재료를 섞거나 난이도를 올리는 조정을 로직 수정 없이 할 수 있었습니다. 손님은 코루틴으로 2~7초 무작위 간격을 두고 등장시켜 한꺼번에 몰리지 않게 했습니다." },
    { type: "code", lang: "csharp", caption: "GameManager.cs · 손님 인덱스 기준 재료 배치 테이블", text: `// Assets/03_Script/Manager/GameManager.cs
private void InitializeGame()
{
    PlaceIngredient = new int[14, 6] {
        { 8, 7, 1, 10, 3, 11},//1
        { 8, 7, 1, 10, 3, 11},//2
        { 8, 7, 1, 2, 6, 15 },//Boss
        { 8, 12, 1, 9, 7, 2 },//3
        { 8, 12, 1, 9, 7, 2 },//4
        { 0, 12, 1, 9, 7, 2 },//5
        { 0, 12, 6, 9, 5, 4 },//Boss2

        { 9, 8, 1, 7, 2, 12 },//1
        { 9, 8, 1, 7, 2, 12 },//2
        { 0, 5, 13, 7, 2, 12},//Boss
        { 0, 5, 4, 3, 2, 12 },//3
        { 0, 5, 4, 3, 2, 12 },//4
        { 0, 14, 4, 3, 15,13},//5
        { 0, 16, 17,11,15,13},//Boss2
    };

    GenerateNewCustomers();
    UpdateIngredientPlacements();
}

private IEnumerator GenerateCustomersWithDelay()
{
    for (int i = 0; i < 3; i++)
    {
        currentDayCustomers[i].CreateCustomer(customerPositions[3].position, customerPositions[i].position, i);
        float randomDelay = Random.Range(2f, 7f);
        yield return new WaitForSeconds(randomDelay);
    }
}

private void UpdateIngredientPlacements()
{
    for (int i = 0; i < 6; i++)
    {
        ingredientBoxes[i].CurIngredient = Ingredients[PlaceIngredient[CurrentCustomer, i]];
    }
}` },

    { type: "h4", text: "XR 연동 · 서빙 순간 물리와 그랩을 정리" },
    { type: "p", text: "XR Interaction Toolkit으로 잡기와 놓기를 처리하고, 접시가 주문대 트리거에 들어오면 XRGrabInteractable과 콜라이더, 중력을 꺼서 손님 손 본에 붙입니다. 접시가 넘겨주는 레시피가 null이면 손님이 잘못된 요리를 받은 것으로 처리해 실패 경로도 같은 함수로 흐르게 했습니다." },
    { type: "code", lang: "csharp", caption: "OderDesk.cs · 접시 서빙과 XR 그랩 해제", text: `// Assets/03_Script/System/OderDesk.cs
private void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Plate"))
    {
        GameObject Plate = other.gameObject;
        Plate.GetComponent<XRGrabInteractable>().enabled = false;
        Plate.GetComponent<BoxCollider>().enabled = false;
        Plate.GetComponent<Rigidbody>().useGravity = false;

        Customer currentCustomer = GameManager.Instance.currentDayCustomers[0];

        // 손님에게 요리를 서빙 (레시피가 없으면 null → 실패 처리)
        currentCustomer.ServeRecipe(Plate.GetComponent<CookPlate>().GiveRecipe());

        // Plate를 손님 손의 자식으로 설정
        Plate.transform.SetParent(currentCustomer.MyHand.transform);
        Plate.GetComponent<Rigidbody>().velocity = Vector3.zero;
        Plate.transform.localPosition = new Vector3(-0.377f, -0.138f, -0.222f);
        Plate.transform.localRotation = Quaternion.Euler(70.984f, -36.387f, -94.968f);
    }
}` },

    { type: "h3", text: "돌아보며" },
    { type: "p", text: "레시피 비교가 접시 재료의 부분집합만 확인해서 재료를 더 올려도 통과되는 문제와, 레시피 순서에 따라 먼저 등록된 요리가 우선되는 문제가 남아 있습니다. 다시 만든다면 재료 수까지 비교하고, 프리팹 대신 ScriptableObject로 레시피를 정의해 씬과 분리하는 방식으로 바꿀 것입니다." },
  ],
  memoria: [
    { type: "h3", text: "두 세계를 오가는 상태 구조" },
    { type: "p", text: "플레이어는 현실을 보는 눈과 가상세계를 보는 눈을 각각 켜고 끌 수 있습니다. 두 눈의 상태 조합으로 캐릭터가 V(가상만), N(현실만), VN(둘 다), E(둘 다 감음) 네 가지 상태를 갖고, 이 상태 하나가 캐릭터 애니메이션, 배경 텍스처, 세계별 오브젝트 활성화, UI 암전을 모두 결정합니다. 게임잼 기간 안에 7명이 리소스를 병렬로 만들어야 했기 때문에, 코드보다 이름 규칙으로 연결하는 구조를 택했습니다." },
    { type: "p", text: "아래 코드는 GitHub 저장소 github.com/aldkl/Memoria 에서 발췌했으며, 가독성을 위해 일부 정리했지만 구조는 원본과 같습니다." },

    { type: "h4", text: "상태 결정 · 두 개의 불리언에서 하나의 상태를 유도" },
    { type: "p", text: "상태를 직접 지정하지 않고 두 눈의 플래그 조합에서 유도합니다. VN과 E는 따로 관리할 필요 없이 자연스럽게 생기고, 상태와 눈 플래그가 어긋날 수 없습니다. 상태 계산은 CStateUpdate 한 곳에서만 일어나고 나머지 시스템은 결과만 읽습니다." },
    { type: "code", lang: "csharp", caption: "CharacterControl.cs · 눈 플래그 토글과 상태 유도", text: `// Assets/01_MyAssets/01_Scripts/01_Player/CharacterControl.cs
public enum CharacterState { V, N, VN, E };

public CharacterState CState;
public string curState;

void CStateUpdate()
{
    if (Input.GetKeyDown(KeyCode.X))   // 현실세계 On/Off
    {
        GameManager.Instance.NEyesON = !GameManager.Instance.NEyesON;
    }

    if (Input.GetKeyDown(KeyCode.C))   // 가상세계 On/Off
    {
        GameManager.Instance.VEyesON = !GameManager.Instance.VEyesON;
    }

    if (GameManager.Instance.VEyesON && GameManager.Instance.NEyesON)
    {
        if (CState != CharacterState.VN) CState = CharacterState.VN;
    }
    else if (!GameManager.Instance.VEyesON && GameManager.Instance.NEyesON)
    {
        if (CState != CharacterState.N) CState = CharacterState.N;
    }
    else if (GameManager.Instance.VEyesON && !GameManager.Instance.NEyesON)
    {
        if (CState != CharacterState.V) CState = CharacterState.V;
    }
    else
    {
        if (CState != CharacterState.E) CState = CharacterState.E;
    }
}

void Update()
{
    CurHorizontal = Input.GetAxisRaw("Horizontal");
    isGrounded();
    if (!GameManager.Instance.IsChatObj.activeSelf)
    {
        CStateUpdate();
        if (CState != CharacterState.E)   // 두 눈을 감으면 조작과 애니메이션 정지
        {
            MoveOn();
            InputKeys();
            AnimatorUpdate();
        }
    }
}` },

    { type: "h4", text: "애니메이션 이름 규칙 · 접두사와 접미사의 조합" },
    { type: "p", text: "이동 로직은 _Move_R, _Idle_L, _Jump_L 같은 동작 접미사만 내보내고, 세계 상태가 V, N, VN 접두사를 붙입니다. 애니메이터는 이 규칙에 맞춰 이름 지은 클립 27개(3세계 × 9동작)만 넣으면 되고, 아티스트는 코드 수정 없이 세계 하나를 통째로 추가할 수 있습니다. 같은 이름을 매 프레임 다시 재생하지 않도록 현재 상태 문자열을 캐시합니다." },
    { type: "code", lang: "csharp", caption: "CharacterControl.cs · 상태별 애니메이션 이름 조립", text: `// Assets/01_MyAssets/01_Scripts/01_Player/CharacterControl.cs
void ChangeAnimationState(string newState)
{
    if (curState == newState) return;

    anim.Play(newState);
    curState = newState;
}

void AnimationChange(string ChangeAni)
{
    switch (CState)
    {
        case CharacterState.V:
            ChangeAnimationState("V" + ChangeAni);
            break;
        case CharacterState.N:
            ChangeAnimationState("N" + ChangeAni);
            break;
        case CharacterState.VN:
            ChangeAnimationState("VN" + ChangeAni);
            break;
    }
}

private void AnimatorUpdate()
{
    anim.SetFloat("fHor", CurHorizontal);
    if (bIsGrounded)
    {
        if (CurHorizontal == 1)       AnimationChange("_Move_R");
        else if (CurHorizontal == -1) AnimationChange("_Move_L");
        else                          AnimationChange(IsLeft ? "_Idle_L" : "_Idle_R");
    }
    else
    {
        if (!bIsLadder) AnimationChange(IsLeft ? "_Jump_L" : "_Jump_R");
        else            AnimationChange("_Ladder_L");
    }
}` },

    { type: "h4", text: "배경 텍스처 전환 · 태그로 오브젝트 종류를 찾고 상태로 세계를 고르기" },
    { type: "p", text: "배경 렌더러는 태그로 종류(건물 1~7, 바닥, 사다리, 플랫폼, 기둥, 문, 벽)를 구분하고, 세 개의 텍스처 배열(N, V, VN)을 같은 인덱스로 나란히 두었습니다. 태그가 인덱스를, 현재 상태가 배열을 고릅니다. 상태가 바뀐 프레임에만 렌더러 전체를 순회하도록 변경 감지를 앞에 두어 매 프레임 비용을 없앴습니다." },
    { type: "code", lang: "csharp", caption: "MaterialChange.cs · 변경 감지 후 태그별 텍스처 교체", text: `// Assets/01_MyAssets/01_Scripts/02_OBJ/MaterialChange.cs
public Renderer[] _RendererBack;
public Texture2D[] VTexture2Ds;
public Texture2D[] VNTexture2Ds;
public Texture2D[] NTexture2Ds;
public CharacterControl.CharacterState CurState;

bool changeState(CharacterControl.CharacterState NewState)
{
    if (CurState == NewState) return false;

    CurState = NewState;
    return true;
}

void ApplyTexture(int i, int j)
{
    switch (CurState)
    {
        case CharacterControl.CharacterState.N:
            _RendererBack[i].material.mainTexture = NTexture2Ds[j];
            break;
        case CharacterControl.CharacterState.V:
            _RendererBack[i].material.mainTexture = VTexture2Ds[j];
            break;
        case CharacterControl.CharacterState.VN:
            _RendererBack[i].material.mainTexture = VNTexture2Ds[j];
            break;
        case CharacterControl.CharacterState.E:
            break;   // 암전 상태에서는 텍스처를 건드리지 않는다
    }
}

void Update()
{
    if (changeState(GameManager.Instance.Player.CState))
    {
        for (int i = 0; i < _RendererBack.Length; i++)
        {
            switch (_RendererBack[i].tag)
            {
                case "Build1": ApplyTexture(i, 0); break;
                case "Build2": ApplyTexture(i, 1); break;
                // ... Build3 ~ Build7 → 2 ~ 6
                case "Ground": ApplyTexture(i, 7); break;
                case "Ladder": ApplyTexture(i, 8); break;
                case "Platform":
                case "MovePlatform": ApplyTexture(i, 9); break;
                case "Column": ApplyTexture(i, 10); break;
                case "Gate": ApplyTexture(i, 11); break;
                case "Wall": ApplyTexture(i, 12); break;
            }
        }
    }
}` },

    { type: "h4", text: "보이는 것과 밟을 수 있는 것을 같은 스위치로" },
    { type: "p", text: "공용 지형은 텍스처만 바뀌지만, 한 세계에만 존재하는 발판은 세계별 부모 오브젝트 아래에 두고 눈 플래그로 통째로 켜고 끕니다. 가상 세계의 눈을 감으면 가상 발판이 보이지 않을 뿐 아니라 실제로 사라지기 때문에, 무엇이 보이는지가 곧 플레이 규칙이 됩니다. 두 눈을 모두 감은 상태는 UI의 검은 이미지로 암전하고 조작을 막습니다." },
    { type: "code", lang: "csharp", caption: "ObjectManager.cs · UIMng.cs · 세계별 오브젝트 활성화와 암전", text: `// Assets/01_MyAssets/01_Scripts/ObjectManager.cs
void Update()
{
    if (GameManager.Instance.VEyesON)
    {
        if (!VObjP.activeInHierarchy) VObjP.SetActive(true);
    }
    else
    {
        if (VObjP.activeInHierarchy) VObjP.SetActive(false);
    }

    if (GameManager.Instance.NEyesON)
    {
        if (!NObjP.activeInHierarchy) NObjP.SetActive(true);
    }
    else
    {
        if (NObjP.activeInHierarchy) NObjP.SetActive(false);
    }
}

// Assets/01_MyAssets/01_Scripts/UIMng.cs
void Update()
{
    if (GameManager.Instance.Player.CState == CharacterControl.CharacterState.E)
    {
        if (!BlackImage.gameObject.activeSelf) BlackImage.gameObject.SetActive(true);
    }
    else
    {
        if (BlackImage.gameObject.activeSelf) BlackImage.gameObject.SetActive(false);
    }
}` },

    { type: "h4", text: "플랫포머 이동 · 가속 램프와 움직이는 발판" },
    { type: "p", text: "이동은 0에서 1로 올라가는 가속 값을 속도에 곱해 짧은 도움닫기 느낌을 주고, 점프는 Rigidbody 임펄스로 처리했습니다. 바닥 판정은 BoxCast로 하고, 움직이는 발판 위에 서면 플레이어를 발판의 자식으로 붙여 함께 이동하게 했습니다." },
    { type: "code", lang: "csharp", caption: "CharacterControl.cs · 가속 이동과 BoxCast 바닥 판정", text: `// Assets/01_MyAssets/01_Scripts/01_Player/CharacterControl.cs
void MoveOn()
{
    if (CurHorizontal != 0)
    {
        if (MoveE < 1) MoveE += Time.deltaTime * MoveEStat;
        if (MoveE > 1) MoveE = 1;
        IsLeft = CurHorizontal != 1;
    }
    else
    {
        MoveE = 0;
    }

    Playertransform.Translate(MoveE * Movespeed * CurHorizontal * Time.deltaTime, 0, 0);
}

void isGrounded()
{
    isHit = Physics.BoxCast(Playertransform.position + AA, Playertransform.localScale / 2f,
                            Vector3.down, out hit, Quaternion.identity, maxDistance, GroundLayer);
    if (isHit)
    {
        bIsGrounded = true;

        if (hit.collider != null && hit.collider.CompareTag("MovePlatform"))
        {
            Playertransform.parent = hit.transform;   // 움직이는 발판과 함께 이동
        }
    }
    else
    {
        bIsGrounded = false;
        Playertransform.parent = GameObject.Find("GameMng").transform;
    }
}` },

    { type: "h3", text: "돌아보며" },
    { type: "p", text: "이름 규칙으로 연결한 구조 덕분에 리소스 추가는 빨랐지만, 문자열로 클립을 재생하기 때문에 오타가 나면 런타임에서야 조용히 실패했습니다. 공중에 있을 때 매 프레임 GameObject.Find로 부모를 되돌리는 부분도 남아 있습니다. 다시 만든다면 클립 참조를 ScriptableObject에 담아 상태별로 묶고, 부모 복귀 대상은 시작 시 한 번만 캐시할 것입니다." },
  ],
  "pokemon-battle-lens": [
    { type: "h3", text: "AI 활용 방법" },
    { type: "p", text: "Codex CLI(GPT-5)와 3일간 페어 프로그래밍으로 만든 프로젝트입니다. 총 72번의 지시와 431번의 셸 실행, 281번의 패치 적용이 세션 로그에 남아 있고, 저장소의 Python 코드 3,577줄은 전부 이 과정에서 생성·수정되었습니다. 저는 코드를 직접 타이핑하는 대신 사양 작성, 실기 테스트, 결과 검증, 방향 결정을 맡았습니다. 대표 이미지는 구현 목표로 삼기 위해 AI 이미지 생성으로 먼저 만든 UI 목업입니다." },

    { type: "h4", text: "1. 사양서를 먼저 쓰고 구현을 맡기기" },
    { type: "p", text: "첫 지시부터 코드가 아니라 제품 요구사항을 넘겼습니다. 단일 파일 실행, 화면 캡처 기반 OCR, 세대별 타입 상성 데이터 분리, ROI 좌표를 설정값으로 노출, SOLID 준수 같은 구조 제약을 미리 정했고, 이 제약은 최종 코드 구조에 그대로 남아 있습니다." },
    { type: "code", lang: "text", caption: "최초 지시 · 사양서 형태로 전달한 요구사항 (발췌)", text: `목표는 포켓몬 게임 화면을 실시간 분석해서 상대 포켓몬에게
내 기술들이 얼마나 효과적인지 표시하는 프로그램이야.

필수 요구사항
- 단일 파일로 실행 가능 / Python / 화면 캡처 기반
- OCR로 상대 이름·기술·레벨 읽기

UI 요구사항
- 작은 오버레이 창, 항상 위 표시 옵션
- 기술별 색상 표시 (매우 효과적=초록, 보통=흰색, 비효율=노랑, 무효=빨강)

중요 요구사항
- 여러 세대 지원 구조로 설계해줘. 1세대 ~ 최신 세대까지 타입 상성 차이를 반영
- 세대별 데이터는 딕셔너리 / JSON 구조로 분리해서 확장 가능하게

코드 품질
- 함수 분리 잘 해줘. 유지보수 쉽게 구조화. 주석 포함. 솔리드 최대한 지켜.
- DS / GBA / Switch / 에뮬레이터 해상도가 달라도 ROI 좌표를 수정할 수 있게 설정값도 포함해줘.` },

    { type: "h4", text: "2. 읽기 전용 에이전트를 병렬로 돌려 원인 조사" },
    { type: "p", text: "스캔 버튼이 바로 멈추는 문제와 UI 레이아웃 문제가 동시에 생겼을 때, 한 에이전트가 순서대로 보게 하지 않고 분석 전용 에이전트 5개를 동시에 띄워 각자 한 가지 관점만 조사하게 했습니다. 모든 조사 지시에 수정 금지를 명시해 분석과 수정 권한을 분리했고, 결과를 종합한 뒤 메인 에이전트가 패치를 한 번에 적용했습니다. 두 번째 배치에서는 OCR을 계속 쓸지 템플릿 매칭으로 바꿀지 같은 기술 선택 리서치를 같은 방식으로 병렬 조사시켰습니다." },
    { type: "code", lang: "text", caption: "병렬 분석 에이전트에 준 지시 (세션 로그 발췌)", text: `[Agent 1] inspect pokemon_battle_lens.py. Focus only on why clicking scan
  may immediately stop. Identify likely exceptions or missing dependency paths
  in _toggle_scan/_scan_loop/capture/OCR. Do not edit files.

[Agent 2] Focus only on main window UI layout problems: log visibility,
  opponent label clipping, move rows should be single-column large rows. Do not edit.

[Agent 3] Focus only on settings dialog responsiveness ... scroll support
  so lower controls do not get cut off. Do not edit.

[Agent 4] compare the current code's UI intentions to assets/ui_mockup_concept.png
  ... Focus on visual style mismatches.

[Agent 5] Focus only on data/display logic for Pokemon sprite, move type badges,
  and footer/log status. Find why sprite might not appear.

--- 2차 배치: 기술 선택 리서치 ---
[R1] practical ways to reduce manual ROI setup using OpenCV/template matching. No edits.
[R2] whether OCR is necessary, and alternatives such as image template matching
  ... or hybrid OCR+CV. Return concise pros/cons and what should be implemented next.
[R3] propose an auto-calibration UI flow: user takes screenshot/preview, app detects
  candidate text boxes, user confirms once. Return concrete code-level plan.` },

    { type: "h4", text: "3. AI 제안을 검증하고 반려하기" },
    { type: "p", text: "AI가 낸 방향을 그대로 받지 않고 실제 게임 화면으로 검증했습니다. 900개가 넘는 기술을 템플릿 이미지로 만들자는 제안은 규모상 맞지 않아 거절하고 흰 글자만 남기는 전처리로 판독 자체를 강화하게 했습니다. 상대 특성을 상성 계산에 자동 반영하자는 제안은 특성이 확정 정보가 아니므로 경고 표시만 하도록 바꿨고, 임시로 넣었던 더블배틀 대응은 ROI 구조가 완전히 달라 되돌린 뒤 README의 범위 항목에 명시했습니다. 데이터가 틀린 경우도 직접 잡아냈습니다." },
    { type: "code", lang: "text", caption: "실제 반려·수정 지시 기록", text: `"근데 이러면 900몇개 되는 기술을 다 할꺼야? 아니잖아. 걍 판독하는 알고리즘을
 강하게 하는게 맞아. 지금 흰색 글씨인데 글씨에 그림자처리나 UI 때문에 잘 못
 알아오는 거 같은데? 이미지를 흰색만 남기게 하고 나머지를 완전 어둡게 처리해줘봐"
   → _white_text_ocr_images 전처리 채택

"자동 보정은 아닌것 같고, '주의! 상대방은 부유 특성일 수도 있습니다' 이런 정도만"
   → ABILITY_WARNINGS: 계산 개입 없이 경고만 표시

"10만볼트 아닌데 왜 니맘대로 적어"
   → AI가 임의로 채운 예시 데이터 제거, PokeAPI 크롤러로 데이터 재생성

"테스트용으로 ROI랑 OCR 바꾸고 싶은데 다시 되돌리기 힘들까봐 겁나네"
   → 설정 스냅샷 저장/복원 기능 추가

"저작권이랑 그런거 전혀 문제 없지?"
   → 스프라이트 1,000여 장 저장소에서 제거, NOTICE.md 작성, 로고 생성 프롬프트에
     공식 캐릭터·몬스터볼 사용 금지 명시` },

    { type: "h4", text: "4. 실기 테스트 결과를 다음 지시로 연결" },
    { type: "p", text: "레벨 숫자가 65를 50으로, 4를 84로 읽는 문제는 스크린샷과 OCR 로그를 주며 세 번에 걸쳐 고쳤습니다. 세그먼트 분할 OCR 결과 우선, 7세그먼트 형태 분류기 추가, 앞자리 노이즈 문자 제거 순서로 커밋이 남아 있습니다. 세대별로 ROI를 저장하다가 X·Y와 오메가루비·알파사파이어처럼 같은 세대 안에 UI가 다른 게임이 있다는 것을 깨닫고, 저장 키를 게임 UI 프로필 16종으로 재설계하되 기존 세대별 설정은 폴백으로 남기게 했습니다." },

    { type: "h3", text: "구현 하이라이트" },
    { type: "p", text: "아래 코드는 AI가 생성하고 제가 검증한 결과물 중 판독 정확도에 직접 영향을 준 부분입니다. 저장소 github.com/aldkl/PokemonBattleLens 에서 전체를 볼 수 있습니다." },

    { type: "h4", text: "한글 자소 분해 유사도 · OCR 오타에 강한 기술명 매칭" },
    { type: "p", text: "OCR이 하이드로펌프를 하미드모펌프로 읽는 식의 오류는 음절 단위 비교로는 잡을 수 없습니다. 한글을 초성·중성·종성으로 분해해 부분 점수를 매기고, 그 점수를 편집 거리의 치환 비용으로 넣어 비슷한 글자는 싼 치환으로 처리하게 했습니다. 초성에 가장 큰 가중치를 둔 것은 종성 오인식이 가장 흔하다는 테스트 관찰에 따른 것입니다." },
    { type: "code", lang: "python", caption: "pokemon_battle_lens.py · 자소 분해와 유사도 기반 편집 거리", text: `def decompose_hangul(char: str) -> Optional[Tuple[int, int, int]]:
    code = ord(char)
    if not 0xAC00 <= code <= 0xD7A3:
        return None
    syllable = code - 0xAC00
    initial = syllable // 588
    vowel = (syllable % 588) // 28
    final = syllable % 28
    return initial, vowel, final


def char_similarity(left: str, right: str) -> float:
    if left == right:
        return 1.0
    left_h = decompose_hangul(left)
    right_h = decompose_hangul(right)
    if left_h and right_h:
        score = 0.0
        if left_h[0] == right_h[0]:
            score += 0.40
        if left_h[1] == right_h[1]:
            score += 0.38
        if left_h[2] == right_h[2]:
            score += 0.22
        return score
    return 0.0


def hangul_aware_similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    rows = len(left) + 1
    cols = len(right) + 1
    dp = [[0.0] * cols for _ in range(rows)]
    for i in range(1, rows):
        dp[i][0] = float(i)
    for j in range(1, cols):
        dp[0][j] = float(j)
    for i in range(1, rows):
        for j in range(1, cols):
            substitution_cost = 1.0 - char_similarity(left[i - 1], right[j - 1])
            dp[i][j] = min(
                dp[i - 1][j] + 1.0,
                dp[i][j - 1] + 1.0,
                dp[i - 1][j - 1] + substitution_cost,
            )
    max_len = max(len(left), len(right))
    return max(0.0, 1.0 - dp[-1][-1] / max_len)` },

    { type: "h4", text: "흰 글자 분리 전처리 · 그림자와 컬러 패널 제거" },
    { type: "p", text: "게임 UI는 컬러 패널 위에 그림자가 있는 흰 글자를 그리기 때문에 일반 이진화는 그림자를 글자로 오인합니다. HSV 범위, BGR 채널 편차, 저채도·고명도 세 마스크를 합쳐 글자만 남기고, Otsu와 adaptive 결과까지 네 장을 돌려 Tesseract가 여러 번 시도하게 했습니다. 임계값은 전부 설정으로 노출해 미리보기에서 조정할 수 있습니다." },
    { type: "code", lang: "python", caption: "pokemon_battle_lens.py · OcrEngine._white_text_ocr_images", text: `def _white_text_ocr_images(self, roi_img, ocr_settings, scale: int = 3):
    bgr = roi_img
    threshold = int(ocr_settings.get("threshold", 150))
    white_min_value = int(ocr_settings.get("white_min_value", max(135, threshold - 10)))
    white_max_saturation = int(ocr_settings.get("white_max_saturation", 105))
    white_channel_delta = int(ocr_settings.get("white_channel_delta", 85))
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h_chan, s_chan, v_chan = cv2.split(hsv)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    bright = max(0, min(255, white_min_value))
    sat_max = max(0, min(255, white_max_saturation))
    delta_max = max(0, min(255, white_channel_delta))
    white_mask = cv2.inRange(hsv, (0, 0, bright), (179, sat_max, 255))
    channel_min = np.min(bgr, axis=2)
    channel_max = np.max(bgr, axis=2)
    balanced_bright = ((channel_min >= bright) & ((channel_max - channel_min) <= delta_max)).astype(np.uint8) * 255
    value_mask = cv2.inRange(v_chan, max(145, bright - 20), 255)
    low_sat_mask = cv2.inRange(s_chan, 0, min(255, sat_max + 15))
    mask = cv2.bitwise_or(white_mask, balanced_bright)
    mask = cv2.bitwise_or(mask, cv2.bitwise_and(value_mask, low_sat_mask))

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.dilate(mask, kernel, iterations=1)

    text_black = np.full(mask.shape, 255, dtype=np.uint8)
    text_black[mask > 0] = 0
    text_black = cv2.resize(text_black, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)

    text_white = 255 - text_black
    gray_scaled = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    _, otsu = cv2.threshold(gray_scaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if otsu.mean() < 127:
        otsu = 255 - otsu
    adaptive = cv2.adaptiveThreshold(gray_scaled, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 9)

    return [text_black, text_white, otsu, adaptive]` },

    { type: "h4", text: "7세그먼트 형태 분류기 · 도트 폰트 레벨 숫자를 OCR 없이 판별" },
    { type: "p", text: "Tesseract가 도트 폰트 숫자를 계속 틀리자 숫자 하나를 28×42로 정규화하고 일곱 영역의 잉크 밀도를 재서 7세그먼트 패턴과 대조하는 분류기를 넣었습니다. 점수는 단순 일치 개수가 아니라 오탐과 미탐에 다른 페널티를 주는 식으로 계산합니다. 이 결과를 Tesseract 결과보다 우선하도록 바꾼 커밋이 레벨 오독 문제를 해결한 지점입니다." },
    { type: "code", lang: "python", caption: "pokemon_battle_lens.py · OcrEngine._classify_digit_shape", text: `def _classify_digit_shape(self, image) -> str:
    ink = image < 180
    if not np.any(ink):
        return ""
    rows = np.where(np.any(ink, axis=1))[0]
    cols = np.where(np.any(ink, axis=0))[0]
    crop = ink[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    norm = cv2.resize(crop.astype(np.uint8) * 255, (28, 42), interpolation=cv2.INTER_NEAREST) > 0
    h, w = norm.shape

    def density(y1, y2, x1, x2) -> float:
        ys = slice(max(0, int(h * y1)), min(h, int(h * y2)))
        xs = slice(max(0, int(w * x1)), min(w, int(w * x2)))
        area = norm[ys, xs]
        return float(area.mean()) if area.size else 0.0

    segments = {
        "top": density(0.00, 0.20, 0.20, 0.80),
        "mid": density(0.40, 0.60, 0.20, 0.80),
        "bottom": density(0.80, 1.00, 0.20, 0.80),
        "ul": density(0.12, 0.48, 0.00, 0.34),
        "ur": density(0.12, 0.48, 0.66, 1.00),
        "ll": density(0.52, 0.88, 0.00, 0.34),
        "lr": density(0.52, 0.88, 0.66, 1.00),
    }
    on = {name: value > 0.18 for name, value in segments.items()}

    # Dot-font digits are close to seven-segment shapes after thresholding.
    patterns = {
        "0": {"top", "bottom", "ul", "ur", "ll", "lr"},
        "1": {"ur", "lr"},
        "2": {"top", "mid", "bottom", "ur", "ll"},
        "3": {"top", "mid", "bottom", "ur", "lr"},
        "4": {"mid", "ul", "ur", "lr"},
        "5": {"top", "mid", "bottom", "ul", "lr"},
        "6": {"top", "mid", "bottom", "ul", "ll", "lr"},
        "7": {"top", "ur", "lr"},
        "8": {"top", "mid", "bottom", "ul", "ur", "ll", "lr"},
        "9": {"top", "mid", "bottom", "ul", "ur", "lr"},
    }
    best_digit = ""
    best_score = -999.0
    active = {name for name, value in on.items() if value}
    for digit, expected in patterns.items():
        true_positive = len(active & expected)
        false_positive = len(active - expected)
        false_negative = len(expected - active)
        score = true_positive * 2.0 - false_positive * 1.4 - false_negative * 1.2
        if score > best_score:
            best_digit = digit
            best_score = score` },

    { type: "h4", text: "스캔 루프 · 병렬 OCR과 전투 화면 감지 기반 자동 일시정지" },
    { type: "p", text: "상대 이름, 레벨, 기술 4개의 OCR을 스레드 풀 4개로 동시에 돌리고, 1차 결과가 기준 점수에 못 미친 항목만 더 비싼 재시도 OCR로 넘깁니다. 전투 중이 아닌 화면에서 엉뚱한 포켓몬이 번갈아 잡히는 문제는 기술 UI가 4프레임 연속 안 보이면 스캔을 멈추고 다시 보이면 재개하는 규칙으로 해결했습니다. 대기 시간에서 처리 시간을 빼 실제 주기를 일정하게 유지합니다." },
    { type: "code", lang: "python", caption: "pokemon_battle_lens.py · PokemonBattleLens._scan_loop (발췌)", text: `def _scan_loop(self) -> None:
    with concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="ocr") as executor:
        while self.scanning:
            started = time.time()
            try:
                frame = self.capture.capture(self.settings)
                settings_snapshot = deep_copy(self.settings)
                roi = settings_snapshot["roi"]
                pokemon_choices = tuple(self.data["pokemon_types"].keys())
                move_choices = tuple(self.data["moves"].keys())

                opponent_future = executor.submit(
                    self.ocr.best_text_for_choices,
                    frame, roi["opponent_name"], settings_snapshot, pokemon_choices, 0.50,
                )
                level_future = executor.submit(
                    self.ocr.digits_from_roi, frame, roi["opponent_level_status"], settings_snapshot,
                )
                move_futures = [
                    executor.submit(
                        self.ocr.best_text_for_choices,
                        frame, roi[f"move_{i}"], settings_snapshot, move_choices, 0.45,
                    )
                    for i in range(1, 5)
                ]
                # ... 1차 결과 수집 후 기준 미달 항목만 robust OCR로 재시도 ...

                move_text_count = sum(1 for item in moves_list if normalize_name(item))
                accepted_move_count = sum(1 for item in move_matches if item)
                if move_text_count == 0 and accepted_move_count == 0:
                    self.not_battle_frames += 1
                else:
                    if self.battle_pause_logged:
                        self.log("Battle UI detected again; OCR resume")
                    self.not_battle_frames = 0
                    self.battle_pause_logged = False

                if self.not_battle_frames >= 4:
                    if not self.battle_pause_logged:
                        self.log("Move UI not detected; waiting for battle screen")
                        self.battle_pause_logged = True
                    self.status_var.set("전투 대기 중")
                    continue
                # ...
            finally:
                elapsed = time.time() - started
                interval = max(100, int(self.settings.get("scan_interval_ms", SCAN_INTERVAL_MS))) / 1000
                time.sleep(max(0.1, interval - elapsed))` },

    { type: "h3", text: "돌아보며" },
    { type: "p", text: "커밋 메타데이터에는 AI 서명이 남아 있지 않아 저장소만으로는 AI 활용 과정을 증명할 수 없다는 점을 뒤늦게 알았습니다. 이후 프로젝트에서는 에이전트 규칙과 작업 기록을 저장소 안에 남기는 방식으로 바꿨습니다. 단일 파일 제약은 배포를 쉽게 했지만 UI 클래스가 1,500줄 넘게 커진 대가가 있었고, 다음에는 모듈 분리를 먼저 요구할 것입니다." },
  ],
  "maple-alim": [
    { type: "h3", text: "AI 활용 방법" },
    { type: "p", text: "Codex CLI와 약 두 달간 33개 커밋으로 만들고 지금도 운영 중인 웹 앱입니다. 프론트엔드는 프레임워크 없는 단일 HTML 파일 약 5,400줄, 백엔드는 Python 표준 라이브러리만 쓴 서버리스 함수로 구성했고, 전체 약 6,000줄이 AI와의 반복 루프로 작성되었습니다. 이 프로젝트에서 가장 신경 쓴 것은 코드가 아니라 에이전트를 운영하는 규칙이었습니다." },

    { type: "h4", text: "1. AGENTS.md로 에이전트 운영 규칙을 성문화" },
    { type: "p", text: "AI 코딩 에이전트는 세션이 끝나면 이전 결정과 남은 작업을 잊어버립니다. 그래서 작업을 시작할 때 반드시 최신 백업 문서를 먼저 읽고, 중요한 변경·결정·실행 명령·남은 할 일을 날짜별 Markdown에 기록한 뒤 종료하도록 규칙을 만들었습니다. 비밀정보 취급 금지와 공개 사이트 변경 후 검증 절차도 같은 문서에 넣어, 매 세션 같은 기준으로 일하게 했습니다." },
    { type: "code", lang: "markdown", caption: "AGENTS.md · 에이전트가 매 세션 따르는 규칙 (발췌)", text: `# MapleAlim Agent Notes

작업을 시작할 때 먼저 다음 파일을 읽는다.
- docs/conversation_backups/latest.md

이 프로젝트는 사용자가 대화 흐름과 결정 내용을 로컬 문서로 계속 백업하길 원한다.
중요한 변경, 결정, 실행 명령, 남은 할 일은 docs/conversation_backups/ 아래
날짜별 Markdown 파일에 추가하고, latest.md도 최신 내용으로 유지한다.

## 공개 서비스 구성
- .env, .env.local, API 키, 캐릭터 캐시와 대화 백업은 공개 저장소에 커밋하거나 출력하지 않는다.
- 공개 사이트 변경 후에는 인라인 JavaScript 문법, 관련 로컬 라우트,
  GitHub Pages Actions 성공과 공개 HTML 반영을 확인한다.

## 목표 설정 초기 기준
- 레벨 목표는 285.35 = Lv.285의 35%처럼 소수 레벨을 사용한다.
- 메소 목표 입력 단위는 억 메소이며, 1.3은 내부 저장 시 130,000,000 메소로 환산한다.
- 추후 실제 레벨별 경험치 표, Nexon API, 사냥·보스 수익 기록과 자동 연동할 수 있도록
  수동 입력 구조를 보존하며 확장한다.` },

    { type: "h4", text: "2. 세션 기록을 고정 포맷으로 남겨 컨텍스트를 이어가기" },
    { type: "p", text: "19개 파일, 약 2,700줄의 작업 기록이 쌓였습니다. 각 세션은 요청 원문, 확인한 내용, 변경 내용, 검증 방법, 남은 할 일 순서로 기록해서 다음 세션의 에이전트가 무엇을 왜 했는지 바로 파악하게 했습니다. 검증 항목에는 Python 컴파일 확인, 로컬 라우트 응답 확인, GitHub Pages Actions 실행 결과처럼 에이전트가 스스로 확인할 수 있는 것만 넣었습니다." },
    { type: "code", lang: "markdown", caption: "docs/conversation_backups/ · 세션 기록 원문 (발췌)", text: `## NEXON Open API 작업 흐름

사용자가 “NEXON OPEN API 를 받아서 쓰고 싶은데 일단 받아와바.”라고 요청했다.

구현한 내용:
- nexon_api.py를 추가했다.
- API 키는 코드에 직접 넣지 않고 NEXON_OPEN_API_KEY 환경변수에서 읽는다.
- 캐릭터명으로 /maplestory/v1/id를 호출해 ocid를 가져온다.
- 기본 조회일은 실행일 기준 어제로 설정했다.

# 2026-08-03 보스 이미지 연결 복구

## 원인
- data/boss_icons.json이 카카오 CDN의 서명된 임시 이미지 URL을 직접 참조하고 있었다.
- 기존 URL의 expires=1785509999가 2026-08-01에 만료되어 보스 아이콘이 표시되지 않았다.

## 실행 및 검증
- 인라인 JavaScript를 new Function()으로 파싱: 성공.
- data/boss_icons.json 파싱 및 모든 매핑 대상 파일 존재 확인: 누락 0개.
- System.Drawing으로 PNG 31개 로드 확인: 손상 파일 0개.

## 배포 후 추가 수정
- 첫 배포 실행은 성공했지만 공개 PNG가 404로 응답했다.
- 원인은 .github/workflows/pages.yml의 정적 사이트 준비 단계가 assets/를 _site에 복사하지 않은 것이었다.
- _site/assets/bosses를 만들고 PNG 파일을 복사하도록 워크플로를 수정했다.` },

    { type: "h4", text: "3. 도메인 판단은 사람이, 리서치와 구현은 에이전트가" },
    { type: "p", text: "게임 내부 수익 공식은 제가 플레이 경험으로 검증하고, 커뮤니티에 흩어진 결정석 가격표와 조각 기대값 표는 에이전트가 찾아 JSON 데이터로 정리하게 했습니다. 조각 드롭이 드롭률에 선형 비례하지 않는다는 것을 발견했을 때는 단순 곱셈을 표 보간으로 바꾸도록 지시했고, 재획비가 합연산이 아니라 곱연산이라는 규칙도 계산식에 직접 반영시켰습니다. 하루에 22개 커밋이 몰린 날이 이 사냥 수익 계산기 개편 작업입니다." },

    { type: "h4", text: "4. 정적 호스팅과 비밀 API 키의 분리" },
    { type: "p", text: "GitHub Pages는 정적이라 API 키를 둘 수 없었습니다. 프론트는 Pages에, NEXON API를 호출하는 Python 함수는 Vercel 서버리스에 배포하고 키는 Vercel 환경변수에만 두었습니다. 무료 한도를 초과하면 과금이 아니라 제한이 걸린다는 점까지 에이전트에게 조사시켜 확인한 뒤 진행했고, 사이트 경로가 서브패스라 로컬에서는 pushState 라우팅을, Pages에서는 해시 라우팅을 쓰도록 환경별로 갈랐습니다." },

    { type: "h3", text: "구현 하이라이트" },
    { type: "p", text: "아래 코드는 AI가 작성하고 제가 실제 데이터로 검증한 부분입니다. 저장소 github.com/aldkl/MapleAlim 에서 전체를 볼 수 있습니다." },

    { type: "h4", text: "서버리스 캐시 · 부분 실패한 응답은 캐시하지 않기" },
    { type: "p", text: "NEXON API는 조회 기준일이 전날이라 날짜와 이름을 캐시 키로 잡으면 자연스럽게 무효화됩니다. 갱신 요청은 5분 쿨다운을 표준 429 응답으로 돌려주고, 어빌리티나 챌린저스 정보 조회가 실패한 응답은 캐시에 넣지 않아 잘못된 값이 6시간 동안 굳는 것을 막았습니다." },
    { type: "code", lang: "python", caption: "api/character.py · Vercel 서버리스 함수의 캐시와 쿨다운", text: `ALLOWED_ORIGINS = {
    "https://aldkl.github.io",
    "http://127.0.0.1:8765",
    "http://localhost:8765",
}
CACHE_TTL_SECONDS = 6 * 60 * 60
REFRESH_COOLDOWN_SECONDS = 5 * 60

def do_GET(self):
    # ...
    if len(name) > 20:
        self._write_json({"error": "캐릭터명이 너무 깁니다."}, status=400)
        return
    if not lookup_date:
        lookup_date = (date.today() - timedelta(days=1)).isoformat()

    cache_key = f"{lookup_date}:{name.casefold()}"
    now = time.time()
    if refresh:
        retry_after = REFRESH_COOLDOWN_SECONDS - (now - _last_refreshes.get(cache_key, 0))
        if retry_after > 0:
            self._write_json(
                {"error": f"캐릭터 정보는 {int(retry_after) + 1}초 후 다시 갱신할 수 있습니다.",
                 "retryAfter": int(retry_after) + 1},
                status=429,
            )
            return
    cached = _character_cache.get(cache_key)
    if not refresh and cached and time.time() - cached["stored_at"] < CACHE_TTL_SECONDS:
        self._write_json({**cached["payload"], "cached": True})
        return

    try:
        payload = get_character_summary(name, lookup_date)
    except NexonApiError as exc:
        self._write_json({"error": str(exc)}, status=502)
        return

    # 부분 실패한 응답은 캐시에 넣지 않는다
    if payload.get("hunting_bonus_stats", {}).get("ability_loaded") is True and \\
       payload.get("hunting_bonus_stats", {}).get("challengers_loaded") is True:
        _character_cache[cache_key] = {"stored_at": time.time(), "payload": payload}` },

    { type: "h4", text: "API 응답 한글 깨짐 복구와 429 백오프" },
    { type: "p", text: "응답 전체를 재귀 순회하며 latin-1로 잘못 해석된 문자열을 cp949로 다시 읽되, 결과에 실제 한글 음절이 나타날 때만 채택해 정상 문자열을 망가뜨리지 않게 했습니다. 호출 제한에 걸리면 짧은 대기 후 최대 세 번 재시도합니다." },
    { type: "code", lang: "python", caption: "nexon_api.py · request_json과 _repair_api_text", text: `def request_json(path, params=None):
    load_env_file()
    api_key = os.environ.get(API_KEY_ENV)
    if not api_key:
        raise NexonApiError(f"{API_KEY_ENV} 환경변수를 먼저 설정해야 합니다.")

    query = urlencode(params or {})
    url = f"{BASE_URL}{path}"
    if query:
        url = f"{url}?{query}"

    request = Request(url, headers={"x-nxopen-api-key": api_key})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=15) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return _repair_api_text(json.loads(response.read().decode(charset)))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            if exc.code == 429 and attempt < 2:
                time.sleep(0.6 * (attempt + 1))
                continue
            raise NexonApiError(f"NEXON API 오류 {exc.code}: {body}") from exc
        except URLError as exc:
            raise NexonApiError(f"NEXON API 연결 실패: {exc.reason}") from exc


def _repair_api_text(value):
    if isinstance(value, dict):
        return {key: _repair_api_text(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_repair_api_text(item) for item in value]
    if not isinstance(value, str):
        return value
    try:
        repaired = value.encode("latin-1").decode("cp949")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value
    return repaired if any("가" <= char <= "힣" for char in repaired) else value` },

    { type: "h4", text: "사냥 수익 계산 · 게임 공식을 그대로 코드로" },
    { type: "p", text: "재획비는 기본 획득률 100%를 포함해 1.2배 곱연산, 드롭률 상한 500%, 메소 주머니 드롭 확률은 드롭률에 따라 60%에서 100%로 수렴, 메소 획득 한도 도달 시 잘림 같은 규칙을 계산식에 넣었습니다. 중간값을 전부 반환해 화면에서 왜 이 숫자가 나왔는지 근거를 그대로 보여 줍니다. 솔 에르다 조각 기대값은 드롭률에 선형이 아니라서 커뮤니티 측정표를 구간 선형보간으로 사용합니다." },
    { type: "code", lang: "javascript", caption: "index.html · getHuntingProjection과 조각 기대값 보간", text: `function getHuntingProjection(character, settings = getCharacterHuntingSettings(character)) {
  const automatic = getHuntingAutomaticRates(character, settings);
  const totalDrop = Number(settings.equipmentDrop) + Number(settings.extraDrop) + automatic.drop;
  const totalMeso = Number(settings.equipmentMeso) + Number(settings.extraMeso) + automatic.meso;
  const baseAcquisitionRate = 100;
  const wealthPotionMultiplier = 1.2;
  const finalDropRate = Math.min(500, (baseAcquisitionRate + totalDrop) * wealthPotionMultiplier);
  const effectiveDrop = finalDropRate - baseAcquisitionRate;
  const dropMultiplier = finalDropRate / baseAcquisitionRate;
  const finalMesoRate = (baseAcquisitionRate + totalMeso) * wealthPotionMultiplier;
  const mesoMultiplier = finalMesoRate / baseAcquisitionRate;
  const levelMultiplier = getMesoLevelMultiplier(Number(character?.character_level) || Number(settings.monsterLevel), Number(settings.monsterLevel));
  const baseMesoPerKill = Number(settings.monsterLevel) * Number(settings.baseMeso) * levelMultiplier;
  const hours = Math.max(0, Math.floor(Number(settings.dailyUnits) || 0)) * 0.5;
  const huntingKills = Math.floor(hours * Math.max(1, Number(settings.killsPerSix)) * 10);
  const mesoBagDropChance = Math.min(1, 0.6 * (1 + effectiveDrop / 100));
  const expectedBaseMesoPerKill = baseMesoPerKill * mesoBagDropChance;
  const targetBaseMeso = Math.min(Number(settings.mesoCap), huntingKills * expectedBaseMesoPerKill);
  const coreCount = huntingKills * (Number(settings.coreRate) / 100) * dropMultiplier;
  const fragmentPerHalfHour = interpolateFragmentExpectation(effectiveDrop) * (Number(settings.killsPerSix) / 1900) * (Number(settings.fragmentRate) / 0.0425);
  const fragmentCount = Number(settings.monsterLevel) >= 260 ? fragmentPerHalfHour * Math.max(0, Math.floor(Number(settings.dailyUnits) || 0)) : 0;
  const finalMesoIncome = targetBaseMeso * mesoMultiplier;
  const itemIncome = coreCount * Number(settings.corePrice) + fragmentCount * Number(settings.fragmentPrice);
  const dailyIncome = finalMesoIncome + itemIncome;
  const weeklyDays = Math.max(0, Math.min(7, Number(settings.weeklyDays)));
  return {
    totalDrop, totalMeso, finalDropRate, finalMesoRate, effectiveDrop, levelMultiplier, mesoBagDropChance,
    targetBaseMeso, huntingKills, hours, coreCount, fragmentCount, finalMesoIncome, itemIncome, dailyIncome,
    weeklyIncome: dailyIncome * weeklyDays,
    monthlyIncome: dailyIncome * (weeklyDays / 7) * 30,
  };
}

const FRAGMENT_EXPECTATION_AT_1900 = [
  [0, 4.04], [67, 6.11], [100, 6.84], [110, 7.03], [120, 7.22], [130, 7.40],
  [140, 7.57], [150, 7.74], [160, 7.90], [170, 8.05], [180, 8.19], [190, 8.34],
  [200, 8.47], [210, 8.61], [220, 8.73], [230, 8.86], [240, 8.98], [250, 9.10],
  [260, 9.21], [270, 9.32], [280, 9.43], [290, 9.53], [300, 9.63], [310, 9.73],
  [320, 9.83],
];

function interpolateFragmentExpectation(dropRate) {
  const rate = Math.max(0, Number(dropRate) || 0);
  const upperIndex = FRAGMENT_EXPECTATION_AT_1900.findIndex(([point]) => point >= rate);
  if (upperIndex === 0) return FRAGMENT_EXPECTATION_AT_1900[0][1];
  if (upperIndex < 0) {
    const [previousRate, previousValue] = FRAGMENT_EXPECTATION_AT_1900.at(-2);
    const [lastRate, lastValue] = FRAGMENT_EXPECTATION_AT_1900.at(-1);
    return lastValue + (rate - lastRate) * (lastValue - previousValue) / (lastRate - previousRate);
  }
  const [lowerRate, lowerValue] = FRAGMENT_EXPECTATION_AT_1900[upperIndex - 1];
  const [upperRate, upperValue] = FRAGMENT_EXPECTATION_AT_1900[upperIndex];
  return lowerValue + (rate - lowerRate) * (upperValue - lowerValue) / (upperRate - lowerRate);
}` },

    { type: "h4", text: "게임 초기화 주기에 맞춘 TODO 자동 리셋" },
    { type: "p", text: "타이머 없이 저장된 주기 키와 현재 주기 키를 비교하는 것만으로 일간, 목요일 기준 주간, 월간 체크를 초기화합니다. 브라우저를 며칠 껐다 켜도 정확하고, 구버전 저장 데이터에 새 필드가 없으면 빈 구조를 채워 넣어 무중단으로 스키마를 옮깁니다." },
    { type: "code", lang: "javascript", caption: "index.html · getWeekKey와 readTodos의 주기 비교 리셋", text: `function getWeekKey() {
  const now = new Date();
  const resetDay = 4;                       // 메이플 주간 초기화 = 목요일 00:00
  const reset = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = (reset.getDay() - resetDay + 7) % 7;
  reset.setDate(reset.getDate() - diff);
  const year = reset.getFullYear();
  const month = String(reset.getMonth() + 1).padStart(2, "0");
  const date = String(reset.getDate()).padStart(2, "0");
  return \`\${year}-\${month}-\${date}\`;
}

// readTodos() 내부 — 저장된 키와 현재 주기 키를 비교해 해당 버킷만 비운다
todos.excluded = todos.excluded && typeof todos.excluded === "object" && !Array.isArray(todos.excluded) ? todos.excluded : {};
Object.values(todos.excluded).forEach((entry) => {
  if (entry && typeof entry === "object" && !entry.tasks) {
    entry.tasks = {};
  }
});
if (todos.dailyDate !== getTodayKey()) {
  todos.dailyDate = getTodayKey();
  todos.done.daily = {};
  todos.accountDone.daily = {};
}
if (todos.weeklyKey !== getWeekKey()) {
  todos.weeklyKey = getWeekKey();
  todos.done.weekly = {};
  todos.done.bosses = {};
  todos.accountDone.weekly = {};
  todos.accountDone.epicDungeon = {};
}
if (todos.monthlyKey !== getMonthKey()) {
  todos.monthlyKey = getMonthKey();
  todos.done.monthlyBosses = {};
}
return todos;` },

    { type: "h3", text: "돌아보며" },
    { type: "p", text: "AGENTS.md와 작업 기록을 저장소 밖에 두어서 공개 저장소만 봐서는 AI 협업 방식이 드러나지 않습니다. 비밀정보가 없는 규칙 문서는 공개해도 되었을 것이고, 다음 프로젝트에서는 규칙과 기록의 공개 범위를 처음부터 나눠 둘 생각입니다. 단일 HTML 파일 구조는 배포가 쉬웠지만 5,000줄을 넘기면서 에이전트의 수정 범위가 넓어져, 화면 단위 분리를 더 일찍 지시했어야 했습니다." },
  ],
  "capstone-lighting": [
    { type: "p", text: "VRC에서의 최적화, 라이팅, 머티리얼 작업, 베이킹 등의 전반적인 작업을 하였습니다." },
    { type: "image", src: "assets/works/capstone-lighting/01.png", caption: "캡스톤Lighting 대표 화면" },
    { type: "h3", text: "디렉셔널 라이트 문제" },
    { type: "p", text: "VRChat 게임의 맵은 Scene 한 개에서만 제작해야 한다는 단점이 있습니다. 한 씬 안에 5개의 구역을 만들다 보니 각 구역에 알맞은 라이트 세팅이 모두 달랐고, 디렉셔널 라이트는 1개라 절충이 필요했습니다." },
    { type: "image", src: "assets/works/capstone-lighting/02.png", caption: "구역별 라이팅 작업" },
    { type: "h3", text: "다른 구역이 화면에 보이는 문제" },
    { type: "p", text: "창문 너머로 다른 구역이 보여 몰입도가 떨어지는 문제가 있었습니다. 이 문제는 카메라의 Far, Near 값을 변경하여 해결했습니다." },
    { type: "image", src: "assets/works/capstone-lighting/03.png", caption: "창문과 구역 노출 문제 확인" },
    { type: "p", text: "외주 라이팅 작업을 하면서 자주 나온 문제는 Generate Lightmap UV였습니다. 이 기능을 켜지 않으면 한 모델링을 여러 개 복사해 제작할 때 베이크맵이 겹쳐 만들어지기 때문에 꼭 체크가 필요했습니다." },
    { type: "p", text: "일부 구역에서는 벽의 디렉셔널 라이트 그림자를 없애야 했고, Cast Shadows와 Receive Shadows를 꺼서 문제를 해결했습니다." },
    { type: "image", src: "assets/works/capstone-lighting/04.png", caption: "그림자 옵션 조정 결과" },
  ],
  tabibuntu: [
    { type: "p", text: "게임에서 스페셜 코인을 먹으면 UI가 나오도록 만들었습니다. 게임매니저를 호출하고, UI 애니메이션을 활용하여 텍스트와 UI Image만 변경하면 되도록 작업했습니다." },
    { type: "image", src: "assets/works/tabibuntu/01.png", caption: "스페셜 코인 UI" },
    { type: "p", text: "스페셜 코인을 획득하면 플레이어가 이미지를 해금하고 이후에도 계속 볼 수 있어야 했기 때문에 저장과 불러오기가 필요했습니다. 간단하게 만들 수 있는 PlayerPrefs를 사용하여 저장과 불러오기를 제작했습니다." },
    { type: "h3", text: "그래플링" },
    { type: "p", text: "고군분투 게임의 핵심인 그래플링을 구현하기 위해 로프를 사용해 물리로 제작할지, 미리 시뮬레이션한 값을 재생할지 고민했습니다. 원작의 매커니즘을 다시 플레이하며 확인한 결과 물리적으로 표현하는 방식으로 구현했습니다." },
    { type: "h3", text: "타일맵 기반 코인 생성" },
    { type: "p", text: "러너 게임에서는 코인이 매우 많기 때문에 하나하나 배치하면 오래 걸리고 수정하기 어렵다고 판단했습니다. 타일맵으로 찍어둔 타일을 Start 함수에서 코인으로 변경하는 클래스를 작성했습니다." },
    { type: "image", src: "assets/works/tabibuntu/02.png", caption: "타일맵을 이용해 코인을 찍어 둔 모습" },
    { type: "p", text: "배경도 같은 방식으로 만들 수 있었지만, 스테이지가 있는 구조가 아니고 세밀한 거리 조절이 어려워 레벨디자인 관점에서 배경은 직접 제작하는 방식으로 판단했습니다." },
  ],
  "accessibility-showroom": [
    { type: "p", text: "다양한 장애인을 위한 제품 전시장 작업입니다. 라이팅 및 머티리얼 생성, 적용을 담당했습니다." },
    { type: "image", src: "assets/works/accessibility-showroom/01.png", caption: "전시장 전체 분위기" },
    { type: "p", text: "전시장 조명이 많이 사용되어 Light를 많이 배치하게 되었는데, 기존 Forward 파이프라인은 8개의 동적 라이트만 지원하는 문제가 있었습니다." },
    { type: "image", src: "assets/works/accessibility-showroom/02.png", caption: "전시장 내부 라이팅" },
    { type: "p", text: "Forward+ 파이프라인을 사용하여 많은 동적 라이트를 사용할 수 있게 했습니다. 그림자 부분이 너무 어둡지 않게 조정한 부분은 의뢰자의 요청과 VR 기기라는 플랫폼에 맞춰 필요한 부분에만 그림자를 넣기 위한 선택이었습니다." },
    { type: "image", src: "assets/works/accessibility-showroom/03.png", caption: "제품 전시 구역" },
  ],
  "et-boardroom": [
    { type: "p", text: "하나의 씬 라이팅 및 머티리얼 생성과 적용을 진행한 외주 작업입니다." },
    { type: "image", src: "assets/works/et-boardroom/01.png", caption: "ET BordRoom 대표 화면" },
    { type: "p", text: "작업 방식은 장애인 기구 전시장 제작과 동일했습니다. 클라이언트분께서 원하시는 구도와 라이팅이 있었기 때문에, 해당 기준에 맞춰 라이트 배치와 머티리얼 톤을 제작했습니다." },
    { type: "image", src: "assets/works/et-boardroom/02.png", caption: "라이팅과 머티리얼 적용 화면" },
  ],
  "urp-lighting": [
    { type: "p", text: "Built-in 파이프라인의 프로젝트를 URP로 변경한 후, RealToon을 URP에 맞게 변환하여 적용하고 게임의 톤에 맞게 포스트프로세싱 작업을 했습니다." },
    { type: "image", src: "assets/works/urp-lighting/01.png", caption: "URP 변경 후 화면" },
    { type: "image", src: "assets/works/urp-lighting/02.png", caption: "라이팅과 포스트프로세싱 조정" },
  ],
  "graphics-basic": [
    { type: "p", text: "게임그래픽엔진기초 기말 결과물입니다. 배치 및 라이트만 작업한 작업물입니다." },
    { type: "p", text: "1300년대 조선을 나타내고자 하여 채도를 높게 가져갔고, 하늘 또한 푸르게 작업했습니다." },
    { type: "image", src: "assets/works/graphics-basic/01.png", caption: "게임그래픽엔진기초 기말 결과물" },
    { type: "p", text: "배치를 하면서 만약 이게 게임이라면 플레이어의 시선이 어떻게 유도될지 의도를 담으면서 작업하려고 노력했습니다." },
  ],
  "graphics-practice": [
    { type: "h3", text: "중간 과제" },
    { type: "image", src: "assets/works/graphics-practice/01.png", caption: "중간 과제 결과물" },
    { type: "h3", text: "기말 과제" },
    { type: "image", src: "assets/works/graphics-practice/02.png", caption: "기말 과제 결과물" },
    { type: "p", text: "배치 및 라이트만 작업한 작업물입니다. 사막을 표현하기 위해 구름은 없고, 모래 폭풍이 온 것 같은 분위기를 의도하여 포그를 진하게 깔았습니다." },
  ],
  "graphics-advanced": [
    { type: "p", text: "게임그래픽엔진심화 과제 결과물입니다. Unreal 기반으로 장면을 구성하고 발표용 이미지와 영상을 정리했습니다." },
    { type: "image", src: "assets/works/graphics-advanced/01.png", caption: "게임그래픽엔진심화 결과 이미지 1" },
    { type: "image", src: "assets/works/graphics-advanced/02.png", caption: "게임그래픽엔진심화 결과 이미지 2" },
  ],
  vfx: [
    { type: "p", text: "게임이펙트제작 과제입니다. 라이트닝, 마법스킬, 피격 이펙트를 제작했습니다." },
    { type: "image", src: "assets/works/vfx/01.png", caption: "게임이펙트제작 결과 이미지" },
  ],
  "watercolor-shader": [
    { type: "p", text: "VRC에서 작동하기 위해 Built-in 쉐이더로 제작했습니다." },
    { type: "image", src: "assets/works/watercolor-shader/02.gif", caption: "수채화 쉐이더 동작 화면" },
    { type: "p", text: "포스트프로세싱으로 제작하는 방식과 기본 메테리얼 쉐이더로 제작하는 방식, 두 가지를 만들었습니다." },
    { type: "image", src: "assets/works/watercolor-shader/01.png", caption: "수채화 쉐이더 결과 이미지" },
    { type: "p", text: "렌더 이미지를 만들어 메테리얼에 값을 넣어주는 파라미터 등을 활용했습니다." },
  ],
  "material-tool": [
    { type: "h3", text: "개요" },
    { type: "p", text: "메테리얼 파라미터 값을 한번에 수정하기 위해 만든 자동화 툴입니다." },
    { type: "image", src: "assets/works/material-tool/03.png", caption: "실제 셰이더 속성과 대상 머티리얼을 불러온 일괄 편집 화면" },
    { type: "p", text: "쉐이더를 넣으면 해당 쉐이더의 파라미터들이 나오게 됩니다. 수정할 파라미터를 체크하고 적용 범위를 선택합니다." },
    { type: "p", text: "적용 범위는 Shader All Materials, Selected Materials, Dragged Materials로 나뉩니다. 대상 미리보기 버튼으로 대상 메테리얼을 확인할 수 있고, 적용 후 Undo(Ctrl + Z)를 할 수 있습니다." },
    { type: "p", text: "쉐이더의 기본값을 수정하기 위해 Shader 기본값 저장 버튼도 만들었습니다." },
    { type: "image", src: "assets/works/material-tool/04.png", caption: "선택한 값을 셰이더 기본값으로 저장하는 화면" },
  ],
  "cloud-forest-shadow": [
    { type: "p", text: "우리 게임 숲의 그림자를 표현하기 위한 기존 방법이 좋지 않아 R&D 및 제작을 진행했습니다." },
    { type: "image", src: "assets/works/cloud-forest-shadow/01.png", caption: "구름 그림자 및 숲 그림자 쉐이더" },
    { type: "h3", text: "숲 쉐이더" },
    { type: "image", src: "assets/works/cloud-forest-shadow/02.png", caption: "숲 그림자 쉐이더 테스트" },
    { type: "p", text: "Sine을 이용해 흔들림을 표현했습니다. 아쉬운 점은 그림자가 좀 더 Sin 노이즈를 통해 흔들리면 좋을 것 같다는 점입니다." },
    { type: "p", text: "SineSpeed는 정해진 Sine 크기를 왕복하는 스피드이고, MaxMoveSize는 Sine 크기를 얼마나 할지 정하는 값입니다." },
    { type: "p", text: "구현 방식은 RenderTexture를 사용했고, CustomRenderTexture에 메테리얼을 넣은 뒤 Directional Light의 Cookie에 넣어 사용했습니다. Size 및 적당한 스피드를 찾아야 합니다." },
    { type: "p", text: "현재 임의로 만든 Forest는 숲의 나뭇잎이 만들어내는 그림자 같지 않아 원화 쪽에서 이미지 제작이 필요하다고 판단했습니다." },
    { type: "image", src: "assets/works/cloud-forest-shadow/03.png", caption: "ForestShadow Mask" },
    { type: "p", text: "추가로 FogLightController를 수정하여 Cookie 값을 바꾸는 코드를 추가할 예정입니다." },
  ],
  "random-tiling": [
    { type: "h3", text: "작업 목표" },
    { type: "p", text: "타일링 되는 바닥의 텍스처 UV를 맞춰서 제작해주는 쉐이더입니다." },
    { type: "h3", text: "작업 내용" },
    { type: "image", src: "assets/works/random-tiling/01.png", caption: "최대 4개의 텍스처를 타일링하도록 제작" },
    { type: "p", text: "최대 4개의 텍스처를 타일링할 수 있도록 제작했습니다." },
    { type: "image", src: "assets/works/random-tiling/02.png", caption: "랜덤하게 작동하도록 하는 해시 함수" },
    { type: "p", text: "랜덤하게 작동할 수 있도록 해시 함수를 사용했습니다. 버텍스 쉐이더에서는 타일링할 UV 정도를 가져옵니다." },
    { type: "image", src: "assets/works/random-tiling/03.png", caption: "월드 기준 타일링" },
    { type: "p", text: "월드에 맞게 타일링되도록 작업했습니다. 어디든 동일한 타일 크기를 가져가게 하기 위해서입니다. 트리거를 통해 조작도 가능하게 제작해두었습니다." },
  ],
  "water-form": [
    { type: "p", text: "청강대 졸업작품에 들어가는 물 쉐이더에서 캐주얼한 foam 파트를 추가한 작업입니다." },
    { type: "image", src: "assets/works/water-form/01.png", caption: "물 쉐이더 전체 화면" },
    { type: "p", text: "Unity URP에 있는 물 쉐이더에 추가로 작업했습니다. 졸업작품을 하는 데 있어 한정된 시간에 높은 퀄리티를 얻을 수 있는 무료 에셋이라고 생각했기 때문입니다." },
    { type: "p", text: "foam을 추가한 이유는 게임은 캐주얼한데 물이 그러한 느낌이 나지 않아서입니다." },
    { type: "image", src: "assets/works/water-form/02.png", caption: "foam 파트 추가 화면" },
    { type: "image", src: "assets/works/water-form/03.png", caption: "물 쉐이더 디테일" },
  ],
};
