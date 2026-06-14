const newPipelineButton = document.querySelector(".new-button");

newPipelineButton.addEventListener("click", () => {
  newPipelineButton.dispatchEvent(
    new CustomEvent("pipeline:create", {
      bubbles: true,
    })
  );
  window.location.href = "analysis-workspace.html";
});
