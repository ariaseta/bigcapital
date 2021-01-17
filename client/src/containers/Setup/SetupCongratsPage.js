import React, { useCallback } from 'react';
import { Button, Intent } from '@blueprintjs/core';
import { useHistory } from "react-router-dom";
import WorkflowIcon from './WorkflowIcon';
import withOrganizationActions from 'containers/Organization/withOrganizationActions';

import 'style/pages/Setup/Congrats.scss';

import { compose } from 'utils';

/**
 * Setup congrats page.
 */
function SetupCongratsPage({
  setOrganizationSetupCompleted,
}) {
  const history = useHistory();

  const handleBtnClick = useCallback(() => {
    setOrganizationSetupCompleted(false);
    history.push('/');
  }, [
    setOrganizationSetupCompleted,
    history,
  ]);

  return (
    <div class="setup-congrats">
      <div class="setup-congrats__workflow-pic">
        <WorkflowIcon width="280" height="330" />
      </div>

      <div class="setup-congrats__text">
        <h1>Congrats! You are ready to go</h1>

        <p class="paragraph">
          It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.
        </p>

        <Button
          intent={Intent.PRIMARY}
          type="submit"
          onClick={handleBtnClick}
        >
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}

export default compose(
  withOrganizationActions,
)(SetupCongratsPage);