import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useJoinRequests } from '@/composables/useJoinRequests';

const mock = new MockAdapter(serverAPI);

let reload;
let team;

beforeEach(() => {
  reload = vi.fn(async () => {});
  team = { _id: 't1', name: 'Byte Me', requestStatus: null, requestId: null };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

describe('useJoinRequests', () => {
  it('openJoin sets the target and clears an old error; closeJoin clears the target', () => {
    const join = useJoinRequests(reload);
    join.joinError.value = 'old';

    join.openJoin(team);
    expect(join.joinTarget.value).toEqual(team);
    expect(join.joinError.value).toBe('');

    join.closeJoin();
    expect(join.joinTarget.value).toBeNull();
  });

  it('submitJoin sends the request, updates the card, shows the toast and reloads', async () => {
    mock
      .onPost('/teams/t1/requests', { role: 'Designer' })
      .reply(201, { _id: 'r1', status: 'pending' });
    const join = useJoinRequests(reload);
    join.openJoin(team);

    await join.submitJoin({ role: 'Designer' });

    expect(join.joinTarget.value).toBeNull();
    expect(team).toMatchObject({ requestStatus: 'pending', requestId: 'r1' });
    expect(join.sentToast.value).toEqual({ teamName: 'Byte Me', requestId: 'r1', team });
    expect(join.isSending.value).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('submitJoin shows no toast when the team accepts straight away', async () => {
    mock.onPost('/teams/t1/requests').reply(201, { _id: 'r1', status: 'accepted' });
    const join = useJoinRequests(reload);
    join.openJoin(team);

    await join.submitJoin({ role: 'Designer' });

    expect(team.requestStatus).toBe('accepted');
    expect(join.sentToast.value).toBeNull();
  });

  it('submitJoin keeps the pop-up open and shows the server error on failure', async () => {
    mock.onPost('/teams/t1/requests').reply(409, { error: 'You already asked to join' });
    const join = useJoinRequests(reload);
    join.openJoin(team);

    await join.submitJoin({ role: 'Designer' });

    expect(join.joinTarget.value).toEqual(team);
    expect(join.joinError.value).toBe('You already asked to join');
    expect(join.isSending.value).toBe(false);
    expect(team.requestStatus).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('undoRequest withdraws, hides the matching toast, resets the card and reloads', async () => {
    mock.onDelete('/teams/requests/r1').reply(204);
    const join = useJoinRequests(reload);
    Object.assign(team, { requestStatus: 'pending', requestId: 'r1' });
    join.sentToast.value = { teamName: 'Byte Me', requestId: 'r1', team };

    await join.undoRequest('r1', team);

    expect(join.sentToast.value).toBeNull();
    expect(team).toMatchObject({ requestStatus: null, requestId: null });
    expect(join.undoingId.value).toBe('');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('undoRequest leaves a toast for a different request alone', async () => {
    mock.onDelete('/teams/requests/r1').reply(204);
    const join = useJoinRequests(reload);
    const toast = { teamName: 'Other', requestId: 'r2', team: {} };
    join.sentToast.value = toast;

    await join.undoRequest('r1');

    expect(join.sentToast.value).toEqual(toast);
  });

  it('undoRequest shows an error and keeps the card when withdrawing fails', async () => {
    mock.onDelete('/teams/requests/r1').reply(404, { error: 'Request not found' });
    const join = useJoinRequests(reload);
    Object.assign(team, { requestStatus: 'pending', requestId: 'r1' });

    await join.undoRequest('r1', team);

    expect(join.undoError.value).toBe('Could not undo the request: Request not found');
    expect(team.requestStatus).toBe('pending');
    expect(join.undoingId.value).toBe('');
    expect(reload).not.toHaveBeenCalled();
  });
});
