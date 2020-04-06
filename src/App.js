import React from 'react'
import './App.css'
import styled from 'styled-components'

function App () {
  return (
    <div className='App'>
      <header className='App-header'>
        IndexedDb
      </header>
      <CheckIDBsupport />
      <IDBContext />
    </div>
  )
}

const CheckIDBsupport = () => {
  const [support, setSupport] = React.useState(null)
  React.useEffect(
    () => {
      setSupport(Boolean('indexedDB' in window))
    }, []
  )
  return (
    <p>
      indexedDB is {support ? '' : 'not '}supported by the current browser.
    </p>
  )
}

// [object eventTargetName]
const stringifyObject = eventTarget => eventTarget.toString().slice(8, -1)

const EventCardContainer = styled.div`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  margin: 10px;
  max-width: 100%;
`
const EventCardStyle = styled.div`
  margin: 10px;
  border: 1px solid black;
  position: relative;

  &::after {
    content: '';
    width: 0px;
    height: 0px;
    border: 10px transparent solid;
    border-left: 10px red solid;
    position: absolute;
    left: calc(100% + 5px);
    top: 50%;
    transform: translateY(-50%);
  }

  &:last-child::after{
    border-left: 10px transparent solid;
  }
`
const EventCardItem = styled.div`
  padding: 5px;
  border: 1px solid black;
  background-color: ${props => props.background};
  color: ${props => props.color};
`
const EventCard = ({ event }) => {
  return (
    <EventCardStyle>
      <EventCardItem background='#282c34' color='#fff'>
        {stringifyObject(event.target)}
      </EventCardItem>
      <EventCardItem>
        {stringifyObject(event)}
      </EventCardItem>
      <EventCardItem>
        {event.type}
      </EventCardItem>
    </EventCardStyle>
  )
}

const IDBContext = () => {
  const [name, setName] = React.useState('test-db')
  // const [version, setVersion] = React.useState(1)
  const [idb, setIdb] = React.useState(null)

  const [eventQueue, setEventQueue] = React.useState([])
  const pushEvent = event => setEventQueue([...eventQueue, event])

  const onNameChange = e => {
    setName(e.target.value)
  }
  // const onVersionChange = e => {
  //   setVersion(e.target.value)
  // }
  const onOpen = e => {
    if (idb) {
      idb.close()
    }

    const openRequest = window.indexedDB.open(name)
    openRequest.addEventListener('success', e => {
      pushEvent(e)
      setIdb(e.currentTarget.result)
    })
    openRequest.addEventListener('error', e => {
      pushEvent(e)
      setIdb(null)
    })
    openRequest.addEventListener('upgradeneeded', e => {
      pushEvent(e)
    })
  }
  const onDelete = e => {
    if (idb) {
      idb.close()
    }

    const deleteRequest = window.indexedDB.deleteDatabase(name)
    deleteRequest.addEventListener('success', e => {
      pushEvent(e)
      setIdb(null)
    })
    deleteRequest.addEventListener('error', e => {
      pushEvent(e)
      setIdb(null)
    })
  }

  return (
    <>
      <p>
        <input
          placeholder='database name'
          value={name} onChange={onNameChange}
        />
        <button onClick={onOpen}>open</button>
        <button onClick={onDelete}>delete</button>
      </p>
      {eventQueue.length
        ? (
          <button onClick={() => setEventQueue([])}>clear event log</button>
        ) : null}
      <EventCardContainer>
        {
          eventQueue.map(
            (event, i) => <EventCard key={i} event={event} />
          )
        }
      </EventCardContainer>
      {
        idb && (
          <p>
          Opened database: {idb.name}, version: {idb.version}
          </p>
        )
      }
    </>
  )
}

export default App
