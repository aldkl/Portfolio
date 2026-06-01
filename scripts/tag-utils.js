(function () {
  const tagGroups = [
    { className: "tag--dimension", tags: ["2D", "3D"] },
    { className: "tag--view", tags: ["사이드뷰", "쿼터뷰", "탑뷰", "백뷰", "1인칭", "VR"] },
    {
      className: "tag--genre",
      tags: ["액션", "플랫포머", "어드벤처", "퍼즐", "시뮬레이션", "레이싱", "슈팅", "전시장", "과제"],
    },
    { className: "tag--engine", tags: ["Unity", "Unreal", "OpenGL", "URP", "Built-in", "Forward", "Deferred"] },
    { className: "tag--tech", tags: ["Shader", "Lighting", "VFX", "Tool", "Editor", "UV", "Texture", "Water", "VRC"] },
  ];

  const slugifyTag = (tag) =>
    tag
      .toLowerCase()
      .replace(/\+/g, "plus")
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "");

  const getTagClassName = (tag) => {
    const group = tagGroups.find((entry) => entry.tags.includes(tag));
    return `${group ? group.className : "tag--default"} tag-value--${slugifyTag(tag)}`;
  };

  window.PORTFOLIO_TAGS = {
    getClassName: getTagClassName,
  };
})();
