// Builds the same login query and redirect URL as Provider login
const url = require('fast-url-parser')
const Request = require('../src/Utils/Request')

const chai = require('chai')
const expect = chai.expect

describe('Login query URL', function () {
  const authEndpoint = 'http://localhost/moodle/mod/lti/auth.php'
  const platform = {
    platformClientId: async () => 'ClientId1',
    platformAuthEndpoint: async () => authEndpoint
  }

  // Sample values shaped like a real Moodle login request, e.g.:
  // login_hint=3&nonce=...&prompt=none&state=...&lti_message_hint=%7B%22launchid%22:...%7D&lti_deployment_id=3
  const params = {
    client_id: 'ClientId1',
    target_link_uri: 'http://localhost:3000/something/lti/v1',
    login_hint: '3',
    lti_message_hint: '{"launchid":"ltilaunch_contentitemselectionrequest831740634"}',
    lti_deployment_id: '3'
  }
  const state = '5f8b8327817bf53d3745e97306e43805b9fd5ea9845538f86c'

  it('formats an authentication URL whose query parameters decode correctly', async () => {
    const query = await Request.ltiAdvantageLogin(params, platform, state)
    const formatted = url.format({
      pathname: await platform.platformAuthEndpoint(),
      query
    })

    expect(() => new URL(formatted)).to.not.throw()
    const parsed = url.parse(formatted, true)

    expect(parsed.protocol + '//' + parsed.host + parsed.pathname).to.equal(authEndpoint)

    expect(parsed.query.response_type).to.equal('id_token')
    expect(parsed.query.response_mode).to.equal('form_post')
    expect(parsed.query.id_token_signed_response_alg).to.equal('RS256')
    expect(parsed.query.scope).to.equal('openid')
    expect(parsed.query.client_id).to.equal(params.client_id)
    expect(parsed.query.login_hint).to.equal(params.login_hint)
    expect(parsed.query.prompt).to.equal('none')
    expect(parsed.query.state).to.equal(state)
    expect(parsed.query.lti_message_hint).to.equal(params.lti_message_hint)
    expect(parsed.query.lti_deployment_id).to.equal(params.lti_deployment_id)
    expect(parsed.query.nonce).to.match(/^[a-z0-9]+$/)

    // redirect_uri is encodeURIComponent'd in Request before url.format encodes again
    expect(query.redirect_uri).to.equal(encodeURIComponent(params.target_link_uri))
    expect(() => decodeURIComponent(parsed.query.redirect_uri)).to.not.throw()
    expect(decodeURIComponent(parsed.query.redirect_uri)).to.equal(params.target_link_uri)
  })
})
