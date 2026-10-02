// Tests for Request.ltiAdvantageLogin redirect URL construction
// Ensures redirect_uri is always the last query parameter

const chai = require('chai')
const expect = chai.expect
const url = require('fast-url-parser')

const Request = require('../dist/Utils/Request')

const platform = {
  platformClientId: async () => 'ClientId1',
  platformAuthEndpoint: async () => 'http://localhost/moodle/AuthorizationUrl'
}

/**
 * Builds the OIDC login redirect URL the same way Provider does.
 */
async function buildLoginRedirectUrl (params, state) {
  const query = await Request.ltiAdvantageLogin(params, platform, state)
  return url.format({
    pathname: await platform.platformAuthEndpoint(),
    query
  })
}

function assertRedirectUriIsLast (redirectUrl, expectedRedirectUri) {
  const queryStart = redirectUrl.indexOf('?')
  if (queryStart < 0) return false
  const queryString = redirectUrl.slice(queryStart + 1)
  if (!queryString) return false

  // redirect_uri must be the final query param; take everything after the last key
  // so values that themselves contain encoded "&" / "?" stay intact
  const redirectUriKey = 'redirect_uri='
  const redirectUriIndex = queryString.lastIndexOf(redirectUriKey)
  if (redirectUriIndex < 0) return false
  if (redirectUriIndex > 0 && queryString[redirectUriIndex - 1] !== '&') return false

  // Must be the last parameter: nothing after the value except the value itself
  const encodedValue = queryString.slice(redirectUriIndex + redirectUriKey.length)
  if (encodedValue.includes('&')) return false

  try {
    return decodeURIComponent(encodedValue) === expectedRedirectUri
  } catch (err) {
    return false
  }
}

describe('Testing Request.ltiAdvantageLogin redirect_uri position', function () {
  it('redirect_uri is expected to be the last query parameter without optional params', async () => {
    const targetLinkUri = 'http://localhost:3000/'
    const redirectUrl = await buildLoginRedirectUrl({
      client_id: 'ClientId1',
      login_hint: '2',
      target_link_uri: targetLinkUri
    }, 'statevalue')
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(true)
  })

  it('redirect_uri is expected to be the last query parameter with lti_message_hint', async () => {
    const targetLinkUri = 'http://localhost:3000/'
    const redirectUrl = await buildLoginRedirectUrl({
      client_id: 'ClientId1',
      login_hint: '2',
      target_link_uri: targetLinkUri,
      lti_message_hint: 'messagehint'
    }, 'statevalue')
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(true)
  })

  it('redirect_uri is expected to be the last query parameter with lti_deployment_id', async () => {
    const targetLinkUri = 'http://localhost:3000/'
    const redirectUrl = await buildLoginRedirectUrl({
      client_id: 'ClientId1',
      login_hint: '2',
      target_link_uri: targetLinkUri,
      lti_deployment_id: '2'
    }, 'statevalue')
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(true)
  })

  it('redirect_uri is expected to be the last query parameter with both optional params', async () => {
    const targetLinkUri = 'http://localhost:3000/launch'
    const redirectUrl = await buildLoginRedirectUrl({
      client_id: 'ClientId1',
      login_hint: '2',
      target_link_uri: targetLinkUri,
      lti_message_hint: 'messagehint',
      lti_deployment_id: '2'
    }, 'statevalue')
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(true)
  })

  it('redirect_uri is expected to be the last query parameter when target_link_uri has one query param', async () => {
    const targetLinkUri = 'http://localhost:3000/launch?resource=abc'
    const redirectUrl = await buildLoginRedirectUrl({
      client_id: 'ClientId1',
      login_hint: '2',
      target_link_uri: targetLinkUri
    }, 'statevalue')
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(true)
  })

  it('redirect_uri is expected to be the last query parameter when target_link_uri has multiple query params', async () => {
    const targetLinkUri = 'http://localhost:3000/launch?foo=1&bar=2&baz=qux'
    const redirectUrl = await buildLoginRedirectUrl({
      client_id: 'ClientId1',
      login_hint: '2',
      target_link_uri: targetLinkUri,
      lti_message_hint: 'messagehint',
      lti_deployment_id: '2'
    }, 'statevalue')
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(true)
  })

  it('redirect_uri is expected to be the last query parameter when target_link_uri has encoded query values', async () => {
    const targetLinkUri = 'http://localhost:3000/launch?q=hello%20world&next=https%3A%2F%2Fexample.com%2Fpath'
    const redirectUrl = await buildLoginRedirectUrl({
      client_id: 'ClientId1',
      login_hint: '2',
      target_link_uri: targetLinkUri
    }, 'statevalue')
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(true)
  })

  it('assertRedirectUriIsLast is expected to return false when redirect_uri is not at the end', () => {
    const targetLinkUri = 'http://localhost:3000/launch?foo=1&bar=2'
    const redirectUrl = url.format({
      pathname: 'http://localhost/moodle/AuthorizationUrl',
      query: {
        response_type: 'id_token',
        redirect_uri: targetLinkUri,
        login_hint: '2',
        state: 'statevalue'
      }
    })
    expect(assertRedirectUriIsLast(redirectUrl, targetLinkUri)).to.equal(false)
  })
})
