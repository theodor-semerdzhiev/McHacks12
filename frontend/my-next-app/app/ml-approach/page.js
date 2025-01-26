
export default function MlApproachPage() {
    return (
      <>
        <h1>Machine Learning Approach</h1>
        <p>
        This Jupyter Notebook showcases our real-time data analysis, a Long short-term memory (LSTM) Architecture based RNN model, training processes, and visual insights that powered our solution. Dive into the details and witness how data meets creativity in this interactive, step-by-step breakdown of our Jupyter Notebook!
        </p>
        <div style={{ width: "100%", height: "80vh", overflow: "hidden", border: "1px solid #ddd" }}>
          <iframe
            src={`/jupyter//analysis.html`}
            title="Machine Learning Notebook"
            style={{ width: "100%", height: "100%", border: "none" }}
          ></iframe>
        </div>
      </>
    );
  }