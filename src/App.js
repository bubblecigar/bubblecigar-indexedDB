import React from 'react'
import './App.css'
import styled from 'styled-components'

const mainColor = '#282c34'

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
    border: 7px transparent solid;
    border-left: 7px ${mainColor} solid;
    position: absolute;
    left: calc(100% + 5px);
    top: 50%;
    transform: translateY(-50%);
  }

  &:last-child::after{
    border-left: 7px transparent solid;
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
      <EventCardItem background={mainColor} color='#fff'>
        {stringifyObject(event.target)}
      </EventCardItem>
      <EventCardItem>
        {stringifyObject(event)}
      </EventCardItem>
      <EventCardItem color={event.type === 'error' ? 'red' : 'green'}>
        {event.type}
      </EventCardItem>
    </EventCardStyle>
  )
}

const IDBContext = () => {
  const [name, setName] = React.useState('test-db')
  const [version, setVersion] = React.useState(1)

  const [eventQueue, setEventQueue] = React.useState([])
  const eventQueueRef = React.useRef([])
  const syncQueue = React.useCallback(
    () => setEventQueue([...eventQueueRef.current]), [setEventQueue]
  )

  const pushEvent = React.useCallback(
    event => {
      eventQueueRef.current.push(event)
      syncQueue()
    }, [syncQueue]
  )

  const [idb, setIdb] = React.useState(null)
  React.useEffect(
    () => {
      if (!idb) return
      idb.onclose = e => {
        pushEvent(e)
      }
      idb.onabort = e => {
        pushEvent(e)
      }
      idb.onerror = e => {
        pushEvent(e)
      }
      idb.onversionchange = e => {
        pushEvent(e)
        e.currentTarget.close()
        pushEvent({
          type: 'close',
          target: idb,
          toString: () => '[object customCloseEvent]'
        })
      }
    }, [idb, pushEvent]
  )

  const onNameChange = e => {
    setName(e.target.value)
  }
  const onVersionChange = e => {
    setVersion(e.target.value)
  }
  const onOpen = e => {
    const openRequest = window.indexedDB.open(name, version)
    openRequest.addEventListener('success', e => {
      if (idb) {
        idb.close()
        pushEvent({
          type: 'close',
          target: idb,
          toString: () => '[object customCloseEvent]'
        })
      }
      setIdb(e.currentTarget.result)
      pushEvent(e)
    })
    openRequest.addEventListener('error', e => {
      pushEvent(e)
    })
    openRequest.addEventListener('upgradeneeded', e => {
      pushEvent(e)
    })
    openRequest.addEventListener('blocked', e => {
      console.log('e:', e)
      pushEvent(e)
      idb && idb.close() && pushEvent({
        type: 'close',
        target: idb,
        toString: () => '[object customCloseEvent]'
      })
    })
  }

  const onDelete = e => {
    const deleteRequest = window.indexedDB.deleteDatabase(name)
    deleteRequest.addEventListener('success', e => {
      pushEvent(e)
    })
    deleteRequest.addEventListener('error', e => {
      pushEvent(e)
    })
  }

  return (
    <>
      <p>
        <input
          placeholder='database name'
          value={name} onChange={onNameChange}
        />
        <input
          style={{ width: '40px' }}
          placeholder='version'
          type='number' min={1}
          value={version} onChange={onVersionChange}
        />
        <button onClick={onOpen}>open</button>
        <button onClick={onDelete}>delete</button>
      </p>
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
