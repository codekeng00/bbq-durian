type EmptyPipelineStateProps = {
  titleId: string;
  onNew?: () => void;
};

export default function EmptyPipelineState({ titleId, onNew }: EmptyPipelineStateProps) {
  return (
    <section className="empty-state" aria-labelledby={titleId}>
      <div className="empty-art-margin" aria-hidden="true">
        <div className="empty-art">
          <span className="art-glow"></span>
          <span className="art-tile">
            <img className="analytics-icon" src="/assets/dashboard-analytics.svg" alt="" />
          </span>
          <span className="floating-icon brain-icon">
            <img src="/assets/dashboard-brain.svg" alt="" />
          </span>
          <span className="floating-icon check-icon">
            <img src="/assets/dashboard-check.svg" alt="" />
          </span>
          <span className="floating-icon message-icon">
            <img src="/assets/dashboard-message.svg" alt="" />
          </span>
        </div>
      </div>
      <div className="empty-copy">
        <h2 id={titleId}>No Active Pipelines Found</h2>
        <p>
          Your pipeline is currently quiet. Start a new conversation analysis or
          upload a sales call to see DealMaker&rsquo;s intelligence in action.
        </p>
        {onNew && (
          <div className="empty-action">
            <button className="new-button" type="button" onClick={onNew}>
              <img src="/assets/dashboard-plus.svg" alt="" aria-hidden="true" />
              New
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
