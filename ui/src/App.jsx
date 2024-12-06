import { useState } from "react";
import * as React from "react";
import { id, Interface, Contract, BrowserProvider } from "ethers";

import {
  CertAddr,
  MyGovernorAddr,
  GovTokenAddr,
  TimeLockAddr,
} from "./contract-data/deployedAddresses.json";
import { abi as Govabi } from "./contract-data/MyGovernor.json";
import { abi as Certabi } from "./contract-data/Cert.json";
import { abi as TokenAbi } from "./contract-data/GovToken.json";
import { abi as TimeLockAbi } from "./contract-data/TimeLock.json";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";

import Chip from "@mui/material/Chip";

import { experimentalStyled as styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";

import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

function App() {
  const [loginState, setLoginState] = useState("Connect");
  const [proposals, setProposals] = useState([['No Proposals', '']]);
  const [pDescription, setPDescription] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [delegateAddress, setDelegateAddress] = useState('');
  const [proposerRole, setProposerRole] = useState('');
  const [executorRole, setExecutorRole] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [voteType, setVoteType] = useState(0); // 0 for against, 1 for for, 2 for abstain
  const [certificates, setCertificates] = useState([]);

  const provider = new BrowserProvider(window.ethereum);
  console.log("Provider:", provider);

  // Token Management Functions
  const mintTokens = async () => {
    try {
      const signer = await provider.getSigner();
      const tokenContract = new Contract(GovTokenAddr, TokenAbi, signer);
      const tx = await tokenContract.mint(userAddress, mintAmount);
      await tx.wait();
      alert('Tokens minted successfully!');
    } catch (error) {
      alert('Error minting tokens: ' + error.message);
    }
  };

  const delegateTokens = async () => {
    try {
      const signer = await provider.getSigner();
      const tokenContract = new Contract(GovTokenAddr, TokenAbi, signer);
      const tx = await tokenContract.delegate(delegateAddress || await signer.getAddress());
      await tx.wait();
      alert('Tokens delegated successfully!');
    } catch (error) {
      alert('Error delegating tokens: ' + error.message);
    }
  };

  // Role Management Functions
  const grantProposerRole = async () => {
    try {
      const signer = await provider.getSigner();
      const timeLockContract = new Contract(TimeLockAddr, TimeLockAbi, signer);
      const PROPOSER_ROLE = await timeLockContract.PROPOSER_ROLE();
      const tx = await timeLockContract.grantRole(PROPOSER_ROLE, proposerRole);
      await tx.wait();
      alert('Proposer role granted successfully!');
    } catch (error) {
      alert('Error granting proposer role: ' + error.message);
    }
  };

  const grantExecutorRole = async () => {
    try {
      const signer = await provider.getSigner();
      const timeLockContract = new Contract(TimeLockAddr, TimeLockAbi, signer);
      const EXECUTOR_ROLE = await timeLockContract.EXECUTOR_ROLE();
      const tx = await timeLockContract.grantRole(EXECUTOR_ROLE, executorRole);
      await tx.wait();
      alert('Executor role granted successfully!');
    } catch (error) {
      alert('Error granting executor role: ' + error.message);
    }
  };

  const checkAdminStatus = async (address) => {
    try {
      const signer = await provider.getSigner();
      const timeLockContract = new Contract(TimeLockAddr, TimeLockAbi, signer);
      const ADMIN_ROLE = await timeLockContract.DEFAULT_ADMIN_ROLE();
      const isUserAdmin = await timeLockContract.hasRole(ADMIN_ROLE, address);
      setIsAdmin(isUserAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleSubmit = async (event) => {
    const signer = await provider.getSigner();
    const Govinstance = new Contract(MyGovernorAddr, Govabi, signer);
    const Certinstance = new Contract(CertAddr, Certabi, signer);

    let paramsArray = [104, "An", "EDP", "A", "25th June"];

    const transferCalldata = Certinstance.interface.encodeFunctionData(
      "issue",
      paramsArray
    );

    try {
      const proposeTx = await Govinstance.propose(
        [CertAddr],
        [0],
        [transferCalldata],
        pDescription
      );
      await proposeTx.wait();
      console.log("Proposal transaction successful:", proposeTx.hash);
      getEvents();
      handleClose();
    } catch (error) {
      console.error("Error proposing transaction:", error);
    }
  };

  const castVote = async (proposalId, support) => {
    try {
      const signer = await provider.getSigner();
      const Govinstance = new Contract(MyGovernorAddr, Govabi, signer);
      const tx = await Govinstance.castVote(proposalId, support);
      await tx.wait();
      alert('Vote cast successfully!');
      getProposalState(proposalId);
    } catch (error) {
      alert('Error casting vote: ' + error.message);
    }
  };

  const queueProposal = async (proposalId) => {
    try {
      const signer = await provider.getSigner();
      const Govinstance = new Contract(MyGovernorAddr, Govabi, signer);
      const descriptionHash = id(proposals.find(p => p[0] === proposalId)[1]);
      const tx = await Govinstance.queue(
        [CertAddr],
        [0],
        ["0x"],
        descriptionHash
      );
      await tx.wait();
      alert('Proposal queued successfully!');
      getProposalState(proposalId);
    } catch (error) {
      alert('Error queueing proposal: ' + error.message);
    }
  };

  const executeProposal = async (proposalId) => {
    try {
      const signer = await provider.getSigner();
      const Govinstance = new Contract(MyGovernorAddr, Govabi, signer);
      const descriptionHash = id(proposals.find(p => p[0] === proposalId)[1]);
      const tx = await Govinstance.execute(
        [CertAddr],
        [0],
        ["0x"],
        descriptionHash
      );
      await tx.wait();
      alert('Proposal executed successfully!');
      getProposalState(proposalId);
    } catch (error) {
      alert('Error executing proposal: ' + error.message);
    }
  };

  const getProposalState = async (proposalId) => {
    try {
      const signer = await provider.getSigner();
      const Govinstance = new Contract(MyGovernorAddr, Govabi, signer);
      const state = await Govinstance.state(proposalId);
      const states = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
      return states[state];
    } catch (error) {
      console.error('Error getting proposal state:', error);
      return 'Unknown';
    }
  };

  const getEvents = async (event) => {
    let eventlogs = [];

    const signer = await provider.getSigner();
    const Govinstance = new Contract(MyGovernorAddr, Govabi, signer);

    const filter = Govinstance.filters.ProposalCreated();
    const events = await Govinstance.queryFilter(filter);
    console.log("ProposalCreated events:", events);

    events.forEach((event) => {
      eventlogs.push([event.args[0].toString(), event.args[8]]);
    });
    setProposals(eventlogs);
    console.log(eventlogs);
  };

  const getCertificates = async () => {
    try {
      const signer = await provider.getSigner();
      const Certinstance = new Contract(CertAddr, Certabi, signer);
      const filter = Certinstance.filters.CertificateIssued();
      const events = await Certinstance.queryFilter(filter);
      const certs = await Promise.all(events.map(async (event) => {
        const cert = await Certinstance.certificates(event.args.certificateId);
        return {
          id: event.args.certificateId.toString(),
          name: cert.name,
          course: cert.course,
          grade: cert.grade,
          date: cert.date
        };
      }));
      setCertificates(certs);
    } catch (error) {
      console.error('Error getting certificates:', error);
    }
  };

  async function connectMetaMask() {
    const signer = await provider.getSigner();
    alert(`Successfully Connected ${signer.address}`);
    setLoginState("Connected");
    setUserAddress(signer.address);
    checkAdminStatus(signer.address);
  }

  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handlePDesChange = (event) => {
    setPDescription(event.target.value);
  };

  return (
    <>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              DAO: Certi App
            </Typography>
            <Button color="inherit" onClick={connectMetaMask}>
              <b>{loginState}</b>
            </Button>
          </Toolbar>
        </AppBar>
      </Box>
      <br />
      
      {/* Token Management Section */}
      {isAdmin && (
        <Box sx={{ mb: 4, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
          <Typography variant="h6">Token Management (Admin Only)</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Address to Mint"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount to Mint"
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={mintTokens}>Mint Tokens</Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Token Delegation Section */}
      <Box sx={{ mb: 4, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
        <Typography variant="h6">Token Delegation</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Delegate Address (leave empty to self-delegate)"
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={delegateTokens}>Delegate Tokens</Button>
          </Grid>
        </Grid>
      </Box>

      {/* Role Management Section */}
      {isAdmin && (
        <Box sx={{ mb: 4, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
          <Typography variant="h6">Role Management (Admin Only)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Address for Proposer Role"
                value={proposerRole}
                onChange={(e) => setProposerRole(e.target.value)}
              />
              <Button variant="contained" onClick={grantProposerRole} sx={{ mt: 1 }}>
                Grant Proposer Role
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Address for Executor Role"
                value={executorRole}
                onChange={(e) => setExecutorRole(e.target.value)}
              />
              <Button variant="contained" onClick={grantExecutorRole} sx={{ mt: 1 }}>
                Grant Executor Role
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      <Button variant="outlined" onClick={handleClickOpen}>
        New Proposal
      </Button>
      <Button
        style={{ marginLeft: "5px" }}
        variant="outlined"
        onClick={getEvents}
      >
        Refresh Proposals
      </Button>
      <Button
        style={{ marginLeft: "5px" }}
        variant="outlined"
        onClick={getCertificates}
      >
        View Certificates
      </Button>

      {/* Certificates Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Issued Certificates</Typography>
        <Grid container spacing={2}>
          {certificates.map((cert) => (
            <Grid item xs={12} sm={6} md={4} key={cert.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Certificate #{cert.id}</Typography>
                  <Typography>Name: {cert.name}</Typography>
                  <Typography>Course: {cert.course}</Typography>
                  <Typography>Grade: {cert.grade}</Typography>
                  <Typography>Date: {cert.date}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <h2>Active Proposals</h2>
      <div
        style={{
          border: "2px solid blue",
          padding: "10px",
          borderRadius: "25px",
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            columns={{ xs: 4, sm: 8, md: 12 }}
          >
            {proposals.map((proposal, index) => (
              <Grid item xs={2} sm={4} md={4}>
                <Card sx={{ minWidth: 275 }}>
                  <CardContent>
                    <Typography component="div" paragraph style={{ wordWrap: 'break-word' }}>
                      <b>Proposal ID: </b>
                      {proposal[0]}
                    </Typography>

                    <Typography variant="body2">{proposal[1]}</Typography>
                  </CardContent>
                  <CardActions>
                    <Button variant="contained">Active</Button>
                    <Button variant="contained" onClick={() => castVote(proposal[0], 1)}>Vote For</Button>
                    <Button variant="contained" onClick={() => castVote(proposal[0], 0)}>Vote Against</Button>
                    <Button variant="contained" onClick={() => queueProposal(proposal[0])}>Queue</Button>
                    <Button variant="contained" onClick={() => executeProposal(proposal[0])}>Execute</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </div>

      <h2>All Proposals</h2>
      <div
        style={{
          border: "2px solid blue",
          padding: "10px",
          borderRadius: "25px",
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ArrowDownwardIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "90%",
              }}
            >
              <Typography>
                <b>Proposal ID: </b>
                40113249118907347497846265566344225737199931284307161947685216366528597413334
              </Typography>
              <Chip label="Success" color="primary" />
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Proposal #1: Issue certificate 101</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ArrowDownwardIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "90%",
              }}
            >
              <Typography>
                <b>Proposal ID: </b>
                40113249118907347497846265566344225737199931284307161947685216366528597413334
              </Typography>
              <Chip label="Success" color="primary" />
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Proposal #2: Issue certificate 102</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ArrowDownwardIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "90%",
              }}
            >
              <Typography>
                <b>Proposal ID: </b>
                40113249118907347497846265566344225737199931284307161947685216366528597413334
              </Typography>
              <Chip label="Success" color="primary" />
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Proposal #3: Issue certificate 104</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ArrowDownwardIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "90%",
              }}
            >
              <Typography>
                <b>Proposal ID: </b>
                40113249118907347497846265566344225737199931284307161947685216366528597413334
              </Typography>
              <Chip label="Success" color="primary" />
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Proposal #4: Issue certificate 104</Typography>
          </AccordionDetails>
        </Accordion>
      </div>
      <React.Fragment>
        <Dialog
          open={open}
          onClose={handleClose}
          PaperProps={{
            component: "form",
            onSubmit: (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const formJson = Object.fromEntries(formData.entries());
              const email = formJson.email;
              console.log(email);
              handleClose();
            },
          }}
        >
          <DialogTitle>New Proposal</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter the details for a new proposal
            </DialogContentText>
            <br />
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value="Function to Execute"
              // onChange={handleChange}
            >
              <MenuItem value="Function to Execute">
                Function to Execute
              </MenuItem>
              <MenuItem value="issue">issue</MenuItem>
            </Select>
            <TextField
              autoFocus
              required
              margin="dense"
              id="name"
              name="email"
              label="Details of the Function to Execute"
              type="email"
              fullWidth
              variant="standard"
            />
            <TextField
              autoFocus
              required
              margin="dense"
              id="name"
              name="email"
              label="Address of the contract"
              type="email"
              fullWidth
              variant="standard"
            />
            <TextField
              autoFocus
              required
              margin="dense"
              id="name"
              name="email"
              label="Description"
              type="email"
              fullWidth
              variant="standard"
              onChange={handlePDesChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </DialogActions>
        </Dialog>
      </React.Fragment>
    </>
  );
}

export default App;