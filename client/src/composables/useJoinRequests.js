import { ref } from 'vue'
import { sendRequest, withdrawRequest, getErrorMessage } from '@/services/teamService'

// Sending a join request, the "Request sent" toast, and undoing it.
// Used by the Teams page and the "Find team" panel on Opportunities.
// reload: called after a send or undo so the page shows the new request status
export function useJoinRequests(reload) {
  const joinTarget = ref(null) // the team in the "Request to join" pop-up
  const joinError = ref('')
  const isSending = ref(false)
  const sentToast = ref(null) // { teamName, requestId, team } while the toast is showing
  const undoingId = ref('') // the request being withdrawn
  const undoError = ref('')

  function openJoin(team) {
    joinError.value = ''
    joinTarget.value = team
  }

  function closeJoin() {
    joinTarget.value = null
  }

  async function submitJoin(request) {
    isSending.value = true
    joinError.value = ''
    try {
      const team = joinTarget.value
      const created = await sendRequest(team._id, request)
      joinTarget.value = null
      // update the card straight away; the reload below then confirms it
      team.requestStatus = created.status
      team.requestId = created._id
      // teams that auto-accept add you straight away, so there is nothing to undo
      if (created.status === 'pending') {
        sentToast.value = { teamName: team.name, requestId: created._id, team }
      }
      await reload()
    } catch (error) {
      console.error(error)
      joinError.value = getErrorMessage(error)
    }
    isSending.value = false
  }

  // team: pass the team card's team so it switches back to "Request to join" straight away
  async function undoRequest(requestId, team = null) {
    undoingId.value = requestId
    undoError.value = ''
    try {
      await withdrawRequest(requestId)
      if (sentToast.value?.requestId === requestId) {
        sentToast.value = null
      }
      if (team) {
        team.requestStatus = null
        team.requestId = null
      }
      await reload()
    } catch (error) {
      console.error(error)
      undoError.value = 'Could not undo the request: ' + getErrorMessage(error)
    }
    undoingId.value = ''
  }

  return {
    joinTarget,
    joinError,
    isSending,
    sentToast,
    undoingId,
    undoError,
    openJoin,
    closeJoin,
    submitJoin,
    undoRequest,
  }
}
