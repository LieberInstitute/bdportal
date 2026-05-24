import { DlgModal } from './DlgModal';
import { useState } from "preact/hooks";

import { Row, Col, Input } from 'reactstrap';

// props.checkLogin is an async function taking (user, pass)
// and returning { user, token } when login succeeds.
export function DlgLogin(props) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [checking, setChecking] = useState(false)
    const [error, setError] = useState('')

    const btnlabel = props.button ? props.button : "Log in"
    const checkLogin = props.checkLogin ? props.checkLogin : async () => true

    function unameChange({ target }) {
        setUsername(target.value)
        if (error) setError('')
    }

    function passwordChange({ target }) {
        setPassword(target.value)
        if (error) setError('')
    }

    function loginEnable() {
        return username.trim().length > 0 && password.length > 0 && !checking
    }

    function loginErrorMessage(err) {
        const status = err && err.response ? err.response.status : 0
        const serverMessage = err && err.response && err.response.data ?
            err.response.data.message : ''
        if (status === 401) return serverMessage || 'Invalid username or password.'
        if (status === 403) return serverMessage || 'This account does not have access to the portal.'
        return serverMessage || 'Login service is not available right now.'
    }

    async function submitHandler() {
        const uname = username.trim()
        if (!uname || !password) return false
        setChecking(true)
        setError('')
        try {
            const loginData = await checkLogin(uname, password)
            if (loginData && loginData.token && props.onLogin) {
                props.onLogin(loginData.user || uname, loginData.token)
            }
            setUsername('')
            setPassword('')
            return true
        } catch (err) {
            setError(loginErrorMessage(err))
            return false
        } finally {
            setChecking(false)
        }
    }

    function toggleDialog(e) {
        setError('')
        setUsername('')
        setPassword('')
        props.toggle(e)
    }

    const dlgOpen = props.isOpen || Boolean(error)

    return (
        <DlgModal title={props.title} isOpen={dlgOpen} toggle={toggleDialog} onSubmit={submitHandler}
          button={checking ? "Checking..." : btnlabel} buttonEnable={loginEnable} invalid={Boolean(error)} width="28rem" >
        <Row className="d-flex form-group align-items-center justify-content-center" style="min-height:2em;">
             { error && <span className="red-text-dark2 text-center">{error}</span> }
             { checking && <div className="spinner-border spinner-border-sm text-danger ml-2" role="status" /> }
        </Row>
        <Row className="d-flex form-group align-items-center">
           <Col xs="4" className="d-flex justify-content-end">
             <span>Username: </span>
           </Col>
           <Col xs="6" className="d-flex justify-content-start p-2">
             <Input type="text" name="username" value={username} onChange={unameChange}
               autoFocus autoComplete="username" />
           </Col>
        </Row>
        <Row className="d-flex form-group align-items-center">
           <Col xs="4" className="d-flex justify-content-end">
             <span>Password: </span>
           </Col>
           <Col xs="6" className="d-flex justify-content-start p-2" >
             <Input type="password" name="password" value={password} onChange={passwordChange}
               autoComplete="current-password" />
           </Col>
        </Row>
        <Row className="w-100 d-flex align-items-center" style="height:1.4em;" />
       </DlgModal>
     )

}
