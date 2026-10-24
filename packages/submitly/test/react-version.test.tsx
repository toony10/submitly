import { render, screen } from "@testing-library/react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { describe, expect, it } from "vitest";

// `vitest.react18.config.ts` sets SUBMITLY_REACT_MAJOR=18 and aliases React 18.
const major = process.env.SUBMITLY_REACT_MAJOR ?? "19";

describe(`React ${major}`, () => {
  it("runs the tests against the expected React", () => {
    expect(React.version.startsWith(`${major}.`)).toBe(true);
    expect(ReactDOM.version.startsWith(`${major}.`)).toBe(true);
  });

  it("renders through @testing-library/react with the same copy", () => {
    function Probe() {
      return <p>{React.version}</p>;
    }

    render(<Probe />);

    expect(screen.getByText(React.version)).toBeTruthy();
  });
});
